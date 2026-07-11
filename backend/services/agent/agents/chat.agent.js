import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getMemory } from "../utils/memory.js";
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import Memory from "../models/memory.model.js";
import { dateString } from "../utils/datetime.js";

import { getUserMemories } from "../utils/getUserMemories.js";
export const chatAgent =
async(state)=>{

await checkAgentLimit(
    state.userId,
    "chat"
  );

   await deductCredits(

        state.userId,

        "chat"

    );

    // allowring streaming responses if the user has enabled it
    
  const llm = getModel("chat", { streaming: state.streaming || false });

 const history =
 await getMemory(
  state.conversationId
 );

 

const memories = await getUserMemories(state.userId);

  let memoryContext = "";
  if (memories.length > 0) {
    memoryContext = `
=========================
KNOWN INFORMATION ABOUT THE USER:
${memories.map(m => `- [${m.category}] ${m.text}`).join("\n")}
=========================
Use this information to personalize your responses.
`;
  }

  console.log(`🧠 [Memory] Retrieved ${memories.length} memories for user ${state.userId}`);

const searchContext = state.searchResults
  ? `
Web Search Results:

${state.searchResults}

Answer the user using only the above search results.
`
  : ""




 const messages = [

  new SystemMessage(
`
You are KifaruAI, an intelligent AI assistant.

${searchContext}
${memoryContext}  
Current date and time: ${ dateString }




If searchContext exists:

- Use search results to answer.
- Do not mention internal tools.

Rules:

- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.

Formatting:

- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.




`
  )

 ];

 history.forEach((msg)=>{

  if(
   msg.role === "user"
  ){

   messages.push(

    new HumanMessage(
     msg.content
    )

   );

  }

  if(
   msg.role === "assistant"
  ){

   messages.push(

    new AIMessage(
     msg.content
    )

   );

  }

 });

 messages.push(

  new HumanMessage(
   state.prompt
  )

 );

 const response = await llm.invoke(messages);



const images = state.searchResults?.images || [];



return {
  ...state,

  response:response.content,
  images:images
  
};

};