// import redis from "../../../shared/redis/redis.js";
// import { graph } from "../graph/supervisor.graph.js";
// import { addMessage } from "../utils/memory.js";
// import axios from "axios"

// export const chat =
// async(req,res,next)=>{

//  try{

//   const {

//    prompt,

//    conversationId,

//    agent

// } = req.body;

// console.log(req.body)
// console.log(req.file)

// await addMessage(
//  conversationId,
//  "user",
//  prompt
// );


// await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
//   conversationId,
//   role:"user",
//   content:prompt
// })







//   const result =
//   await graph.invoke({

//    prompt,

//    conversationId,

//    userId:
//    req.headers[
//     "x-user-id"
//    ],
//    agent,
//    file:req.file

//   });


//   console.log("after res",result)

//   await addMessage(
//  conversationId,
//  "assistant",
//  result.response
// );
// await axios.post(
//  `${process.env.CHAT_SERVICE}/save-message`,
//  {
//   conversationId,
//   role:"assistant",
//   content:result.response,
//   images:result.images,
//   artifacts:
//   result.artifacts || []
//  }
// )

//   return res.json({

//  success:true,

//  answer:
//  result.response,
//  images:result.images,
//  artifacts:
//  result.artifacts || []

// });

//  }catch(error){

//   next(error)

//  }

// }


import fs from "fs/promises";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";
import { enqueueMemoryExtraction } from "../queues/memory.queue.js";
export const chat = async (req, res, next) => {
  try {
    const { prompt, conversationId, agent } = req.body;
    const file = req.file;

    // Check if client wants streaming (query param or Accept header)
    const wantsStream = req.query.stream === 'true' ||
      req.headers.accept?.includes('text/event-stream');

    // 1. Save user message (always)
    await addMessage(conversationId, "user", prompt);
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "user",
      content: prompt,
    });
    console.log(`💾 [Memory] Saved user message for conversation ${conversationId}`);
    enqueueMemoryExtraction(
      req.headers["x-user-id"],
      prompt,
      conversationId
    ).catch(err => console.error("Memory queue error:", err));

    if (!wantsStream) {
      // ---- NON-STREAMING (original behaviour) ----
      const result = await graph.invoke({
        prompt,
        conversationId,
        userId: req.headers["x-user-id"],
        agent,
        file,
        streaming: false, // explicitly false
      });

      // Save assistant message
      await addMessage(conversationId, "assistant", result.response);
      await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "assistant",
        content: result.response,
        images: result.images,
        artifacts: result.artifacts || [],
      });


      return res.json({
        success: true,
        answer: result.response,
        images: result.images,
        artifacts: result.artifacts || [],
      });
    }

    // ---- STREAMING ----
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Prepare initial state with streaming flag
    const initialState = {
      prompt,
      conversationId,
      userId: req.headers["x-user-id"],
      agent,
      file,
      streaming: true, // <-- tells agents to use streaming LLM
    };

    let fullResponse = '';
    let images = [];
    let artifacts = [];
    let errorOccurred = false;

    try {
      // Use graph.streamEvents to get token-level events
      const eventStream = graph.streamEvents(initialState, { version: "v2" });

      for await (const event of eventStream) {
        // Only token events from non‑router nodes
        if (event.event === 'on_chat_model_stream' &&
          event.metadata?.langgraph_node !== 'router') {
          const token = event.data?.chunk?.content;
          if (token) {
            fullResponse += token;
            sendEvent({ type: 'token', token });
          }
        }

        // Capture final state when graph ends (to get images/artifacts)
        if (event.event === 'on_chain_end' && event.name === 'LangGraph') {
          const output = event.data?.output;
          if (output) {
            images = output.images || [];
            artifacts = output.artifacts || [];
          }
        }

        // Capture errors
        if (event.event === 'on_chain_error') {
          errorOccurred = true;
          const errMsg = event.data?.error?.message || 'Unknown error';
          sendEvent({ type: 'error', message: errMsg });
        }
      }

      if (!errorOccurred) {
        sendEvent({
          type: 'end',
          response: fullResponse,
          images,
          artifacts,
        });
      }

    } catch (err) {
      errorOccurred = true;
      sendEvent({ type: 'error', message: err.message });
    } finally {
      res.end();
    }

    // Save assistant message after streaming ends
    if (fullResponse && !errorOccurred) {
      await addMessage(conversationId, "assistant", fullResponse);
      await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "assistant",
        content: fullResponse,
        images,
        artifacts: artifacts || [],
      });
    }

    // Clean up uploaded file if any
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
      } catch (cleanErr) {
        console.log('File cleanup error:', cleanErr.message);
      }
    }

  } catch (error) {
    next(error);
  }
};