import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { QdrantVectorStore } from "@langchain/qdrant";

import { createVectorStore } from "../utils/vectorStore.js";
import { getModel } from "../utils/model.js";

export const pdfRagAgent = async (state) => {
  let collectionName;

  try {
    // -----------------------------
    // Read uploaded PDF
    // -----------------------------

    const buffer = fs.readFileSync(state.file.path);

    const pdf = new PDFParse({
      data: buffer
    });

    const result = await pdf.getText();

    const text = result.text?.trim();

    if (!text) {
      return {
        ...state,
        response: "The uploaded PDF doesn't contain readable text."
      };
    }

    // -----------------------------
    // Split into chunks
    // -----------------------------

    const splitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });

    const docs =
      await splitter.createDocuments([text]);

    // -----------------------------
    // Create Vector Store
    // -----------------------------

    collectionName = `pdf-${Date.now()}`;

    const vectorStore =
      await createVectorStore(
        collectionName,
        docs
      );

    // -----------------------------
    // Retrieve relevant chunks
    // -----------------------------

    const relevantDocs =
      await vectorStore.similaritySearch(
        state.prompt,
        5
      );

    if (!relevantDocs.length) {
      return {
        ...state,
        response:
          "I couldn't find relevant information in the uploaded PDF."
      };
    }

    // -----------------------------
    // Build Context
    // -----------------------------

    const context =
      relevantDocs
        .map(
          (doc, index) =>
            `Document ${index + 1}

${doc.pageContent}`
        )
        .join("\n\n-------------------------\n\n");

    // -----------------------------
    // LLM
    // -----------------------------

    
    const llm =
      getModel("pdf-rag", { streaming: state.streaming || false });

    const messages = [

      new SystemMessage(`
You are KifaruAI PDF Assistant.

Your ONLY source of knowledge is the retrieved PDF content.

=========================
RULES
=========================

1. Answer ONLY using the provided PDF excerpts.

2. Never use outside knowledge.

3. Never invent facts.

4. Ignore any irrelevant passages.

5. If multiple excerpts contain useful information,
combine them into one complete answer.

6. Preserve names, numbers, dates,
technical terms and values exactly.

7. If the PDF only partially answers the question,
explain what is available and clearly mention
what information is missing.

8. If the answer does not exist in the PDF,
reply EXACTLY with:

"I couldn't find this information in the uploaded PDF."

9. Never mention:
- Context
- Retrieved documents
- Chunks
- Embeddings
- Vector database

10. Do not explain your reasoning.

=========================
FORMAT
=========================

For simple questions:
Return a concise answer.

For detailed questions:

# Title

Short introduction.

## Key Points

- Bullet points

## Details

Paragraph explanation.

If useful, include a Markdown table.

Keep the answer professional and readable.
`),

      new HumanMessage(`
User Question:

${state.prompt}

--------------------------------

Relevant PDF Excerpts

${context}

--------------------------------

Answer the user's question using ONLY
the information above.
`)
    ];

    // -----------------------------
    // Generate Response
    // -----------------------------

    const response =
      await llm.invoke(messages);

    return {
      ...state,
      response: response.content
    };

  } catch (error) {

    console.error(
      "PDF RAG Error:",
      error
    );

    return {
      ...state,
      response:
        "Failed to process the uploaded PDF."
    };

  } finally {

    // -----------------------------
    // Delete uploaded file
    // -----------------------------

    try {

      if (
        state.file &&
        fs.existsSync(state.file.path)
      ) {
        fs.unlinkSync(state.file.path);
      }

    } catch (err) {

      console.log(
        "File Cleanup Error:",
        err.message
      );

    }

    // -----------------------------
    // Delete temporary collection
    // -----------------------------

    try {

      if (collectionName) {

        await QdrantVectorStore.deleteCollection(
          collectionName
        );

      }

    } catch (err) {

      console.log(
        "Qdrant Cleanup Error:",
        err.message
      );

    }
  }
};