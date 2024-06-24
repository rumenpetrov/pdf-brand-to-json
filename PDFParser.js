import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { openai } from './openai.js'

export default class PDFParser {
  constructor(props) {
    const { src, questions, template, model = 'gpt-4' } = props;

    if (typeof src === 'string') {
      this.src = src;
    } else {
      throw new Error('Invalid "src" property. Path to PDF file expected as string.')
    }

    if (Array.isArray(questions) && questions.length > 0) {
      this.questions = questions;
    } else {
      throw new Error('Invalid "questions" property. Questions expected as array of strings')
    }

    if (typeof template === 'string') {
      this.template = template;
    } else {
      throw new Error('Invalid "template" property. Output format template expected as string.')
    }

    this.model = model;
  }

  createStore (docs) {
    return MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings())
  }

  docsFromPDF () {
    // https://js.langchain.com/v0.2/docs/integrations/document_loaders/file_loaders/pdf/
    const loader = new PDFLoader(this.src)

    return loader.load()
  }

  async loadStore () {
    const pdfDocs = await this.docsFromPDF()

    return this.createStore([...pdfDocs])
  }

  async getSearchResults () {
    const store = await this.loadStore()
    const output = await Promise.all(this.questions.map(async (question) => {
      const result = await store.similaritySearch(question, 1);

      return {
        question,
        content: result.map((r) => r.pageContent).join('\n'),
      };
    }))

    return output;
  }

  async start () {
    const results = await this.getSearchResults();

    const systemPrompt =`
      You are precise PDF parser.
      You extract information from a PDF file, provided to you.
      You will receive list of questions.
      Find the most precise, short, on point, single value answer for every question.
      You will receive an output format template which you have to use for your output.
      Replace every question placeholder with your answer for the question.

      Remember while answering:
        * Replay with value only if it is present in the verified sources
        * If you replay with value from the verified sources, copy the it exactly character for character and make sure it is the same like in the PDF document.
        * Only talk about the value, do not reference the verified sources.
        * Do not make up any part of an answer. If the answer isn't in or derivable from the verified sources just return null.
        * If the answer isn't in or derivable by the verified sources nor the history just return null.
        * Create the final output a valid json.

      Begin!
    `;
    const userPrompt = `
      Replace every question placeholder with your answer for the question in the following template using the provided context. If you cannot answer the question with the context, don't lie and make up stuff. Just return null.

      Template:
      ${this.template}

      Context:
      ${results.map((result) => `Question ${result.question}\nSource content:${result.content}`).join('\n')}
    `;

    const response = await openai.chat.completions.create({
      // E.g. 'gpt-3.5-turbo', 'gpt-4', 'gpt-4o',
      model: this.model,
      temperature: 0,
      messages: [
        {
          role: 'assistant',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    return response.choices[0].message.content;
  }
};
