// Format definition for tutorial topics
// Covers how-to guides, walkthroughs, practical implementations, and learning resources.

import type { FormatDefinition } from "./index";

export const tutorialFormat: FormatDefinition = {
  topicType: "tutorial",

  jsonSchema: {
    tldr: "What you'll learn and why (1-2 sentences)",
    prerequisites: "What you need before starting (tools, accounts, knowledge)",
    steps: "Array of {step: number, title: string, content: string, code_snippet: string} objects",
    common_issues: "Troubleshooting — what usually goes wrong and how to fix it",
    next_steps: "Where to go from here, related topics",
    sources: "Array of {title, url, platform} objects",
  },

  promptInstructions: `This is a practical guide. The reader has their editor open and wants to follow along.

- In "prerequisites", be exhaustive. Nothing kills a tutorial faster than a missing dependency on step 3. Include versions: "Node.js 18+" not just "Node.js."
- In "steps", each step should be independently verifiable. After completing step 2, the reader should be able to confirm it worked before moving to step 3.
- Include "code_snippet" for any step that involves code. Use complete, copy-pasteable snippets — not fragments. If a code block references a variable from a previous step, show the full context.
- In "common_issues", focus on the errors people actually hit. "If you see 'EACCES permission denied', run with sudo" is useful. Generic "check your configuration" is not.
- In "next_steps", link to specific topics, not vague areas. "Build a RAG pipeline using this same embedding model" is good. "Explore more features" is useless.
- Keep explanations short between code blocks. The reader is here to do, not to read.`,

  fewShotGood: `{
  "tldr": "Build a local RAG chatbot that answers questions about your own documents using Ollama (free, runs locally) and LangChain. No API keys or cloud services needed.",
  "prerequisites": "- **Python 3.10+** (check: \\\`python --version\\\`)\\n- **Ollama** installed and running (\\\`brew install ollama\\\` on Mac, or download from ollama.com)\\n- **~8GB RAM** free (for the embedding model + LLM)\\n- Pull the models first: \\\`ollama pull llama3.1\\\` and \\\`ollama pull nomic-embed-text\\\`\\n- A folder of documents you want to chat with (PDF, .txt, or .md files)",
  "steps": [
    {
      "step": 1,
      "title": "Install dependencies",
      "content": "Set up a virtual environment and install the required packages. LangChain handles the orchestration, ChromaDB stores the embeddings locally.",
      "code_snippet": "python -m venv rag-env\\nsource rag-env/bin/activate\\npip install langchain langchain-community chromadb pypdf"
    },
    {
      "step": 2,
      "title": "Load and chunk your documents",
      "content": "Point the loader at your documents folder. The text splitter breaks documents into overlapping chunks — 500 characters with 50-character overlap works well for most documents.",
      "code_snippet": "from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader\\nfrom langchain.text_splitter import RecursiveCharacterTextSplitter\\n\\nloader = DirectoryLoader('./my-docs', glob='**/*.pdf', loader_cls=PyPDFLoader)\\ndocs = loader.load()\\n\\nsplitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)\\nchunks = splitter.split_documents(docs)\\nprint(f'Split {len(docs)} documents into {len(chunks)} chunks')"
    },
    {
      "step": 3,
      "title": "Create the vector store",
      "content": "Embed the chunks using Ollama's nomic-embed-text model and store them in ChromaDB. This runs entirely on your machine — no data leaves your computer.",
      "code_snippet": "from langchain_community.embeddings import OllamaEmbeddings\\nfrom langchain_community.vectorstores import Chroma\\n\\nembeddings = OllamaEmbeddings(model='nomic-embed-text')\\nvectorstore = Chroma.from_documents(chunks, embeddings, persist_directory='./chroma-db')\\nprint(f'Stored {len(chunks)} chunks in vector database')"
    },
    {
      "step": 4,
      "title": "Build the RAG chain",
      "content": "Connect the vector store to Llama 3.1 via a retrieval chain. The retriever pulls the 3 most relevant chunks for each question.",
      "code_snippet": "from langchain_community.llms import Ollama\\nfrom langchain.chains import RetrievalQA\\n\\nllm = Ollama(model='llama3.1')\\nretriever = vectorstore.as_retriever(search_kwargs={'k': 3})\\n\\nqa_chain = RetrievalQA.from_chain_type(\\n    llm=llm,\\n    retriever=retriever,\\n    return_source_documents=True\\n)\\n\\n# Test it\\nresult = qa_chain.invoke({'query': 'What are the main topics in these documents?'})\\nprint(result['result'])"
    }
  ],
  "common_issues": "- **'Connection refused' from Ollama:** Make sure Ollama is running (\\\`ollama serve\\\` in a separate terminal). It doesn't auto-start on Linux.\\n- **Out of memory:** Llama 3.1 8B needs ~5GB RAM. If you're low, try \\\`ollama pull phi3:mini\\\` (2.7GB) instead.\\n- **Slow first query:** The first query is slow (~30s) because Ollama loads the model into memory. Subsequent queries are 2-5s.\\n- **Empty results:** If the retriever returns nothing relevant, your chunks may be too small or too large. Try chunk_size=1000 for longer documents.",
  "next_steps": "- Add a web UI with Streamlit: \`pip install streamlit\` and wrap the chain in a chat interface\\n- Try different chunking strategies — semantic chunking (split by meaning) often beats fixed-size\\n- Add conversation memory so follow-up questions work: use \`ConversationalRetrievalChain\` instead of \`RetrievalQA\`\\n- Index more file types: LangChain supports .docx, .csv, .html, and Notion exports",
  "sources": []
}`,

  fewShotBad: `{
  "tldr": "Learn how to build an exciting AI application using the latest tools and technologies available today.",
  "prerequisites": "Basic programming knowledge and access to a computer with internet connection.",
  "steps": [
    {
      "step": 1,
      "title": "Set up your environment",
      "content": "First, you'll need to set up your development environment. Make sure you have all the necessary tools installed.",
      "code_snippet": "# install the required packages"
    },
    {
      "step": 2,
      "title": "Write the code",
      "content": "Now you can start writing the main application code. Follow the documentation for the specific library you're using.",
      "code_snippet": "# your code here"
    }
  ],
  "common_issues": "If you encounter any issues, check the documentation or search online for solutions. Make sure all your dependencies are properly installed.",
  "next_steps": "Continue exploring the technology and building more advanced applications. There are many resources available online to help you learn more.",
  "sources": []
}`,
};
