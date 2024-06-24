import PDFParser from './PDFParser.js'

const QUESTIONS = [
  '1: What is the name of the company the brand guidelines document is written for?',
  '2: What is the primary (core) color? I expect web-safe (CSS) value, preferably in HEX format.',
  '3: What is the secondary color? I expect web-safe (CSS) value, preferably in HEX format.',
  '4: What is the primary font (typeface)?',
  '5: What is the secondary (alternative) font (typeface)?',
];
const TEMPLATE =
`
{
  "companyName": "Question 1",
  "palette": {
    "primary": "Question 2",
    "secondary": "Question 3",
  },
  "typography": {
    "primary": "Question 4"
    "secondary": "Question 5"
  }
}
`

const parser = new PDFParser({
  src: process.argv[2],
  questions: QUESTIONS,
  template: TEMPLATE,
  model: 'gpt-3.5-turbo',
});

const content = await parser.start();
const divider = '====================================================================================================';
const output = `${divider}\n${content}\n${divider}`;

console.log(output);
