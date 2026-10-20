
import './App.css'
import { useState, useRef } from 'react';
import Quiz from './Quiz.jsx'
import LandingDashboard from "./LandingDashboard";

function App() {
  const [showQuiz, setShowQuiz] = useState(false);
  const ref1 = useRef(null);
  const [Mcqs, setMcqs] = useState([]);
  const [showLanding, setShowLanding] = useState(true);
  const [Generate, setGenerate] = useState(false);
  const isGenerating = useRef(false);


  async function handleGenerate() {
    if (isGenerating.current) return;

    if (!ref1.current.value.trim()) {
      console.log("Please enter MCQs first.");
      return;
    }

    isGenerating.current = true;
    setGenerate(true);

    try {
      const data = await Chat();

      if (data?.mcqs?.length > 0) {
        setShowQuiz(true);
      } else {
        console.log("Quiz generate nahi hua.");
      }
    } catch (error) {
      console.error("Error:", error.message);
    } finally {
      isGenerating.current = false;
      setGenerate(false);
    }
  }



  const APIKEY = import.meta.env.VITE_GROQ_API_KEY;
  const SYSTEM_PROMPT = `
  You are an intelligent MCQ Generator and Text Converter.
  
  Your task is to process any text, notes, paragraphs, documents,
  or educational content provided by the user and return MCQs
  in the required JSON format.
  
  Follow these rules carefully:
  
  1. IDENTIFY THE INPUT TYPE
  
  First, determine whether the provided content already contains
  MCQs or is general information without MCQs.
  
  2. IF MCQs ALREADY EXIST
  
  - Extract the existing MCQs from the provided content.
  - Preserve the original questions, options, and correct answers.
  - Convert the MCQs into the required JSON format.
  - Do not generate additional MCQs unless explicitly requested.
  - If some formatting is inconsistent, clean it while preserving
    the original meaning.
  - If an MCQ has fewer than four options, include only the
    available options instead of inventing new ones.
  - If the correct answer is missing or cannot be identified,
    use an empty string for "answer".
  
  3. IF MCQs DO NOT EXIST
  
  - Generate relevant MCQs based on the provided content.
  - Questions must be based on the given information.
  - Do not introduce unrelated facts or unsupported information.
  - Each question should test an important concept from the input.
  - Generate as many useful MCQs as the provided content supports.
  - Each generated MCQ should have four distinct options labelled
    A, B, C, and D.
  - Ensure that exactly one option is correct for each generated MCQ.
  - Set the "answer" field to the label of the correct option.
  - Do not create duplicate or repetitive questions.
  
  4. REQUIRED OUTPUT FORMAT
  
  Return the result in this JSON structure:
  
  {
      "mcqs": [
          {
              "question": "Question text",
              "options": [
                  { "label": "A", "text": "Option 1" },
                  { "label": "B", "text": "Option 2" },
                  { "label": "C", "text": "Option 3" },
                  { "label": "D", "text": "Option 4" }
              ],
              "answer": "D"
          }
      ]
  }
  
  5. OUTPUT RULES
  
  - Return only valid JSON.
  - Do not include Markdown, explanations, or introductory text.
  - Use double quotes for JSON keys and string values.
  - Do not include trailing commas.
  - Ensure the output can be parsed using JSON.parse().
  - If no useful MCQs can be created from the input, return:
    { "mcqs": [] }
  `;

  /*
const SYSTEM_PROMPT = `
You are an MCQ text converter.

Convert the MCQs provided by the user into valid JSON.
Preserve the original questions, options, and correct answers.
Do not create new MCQs.

Return only valid JSON in this format:
{
    "mcqs": [
        {
            "question": "Question text",
            "options": [
                { "label": "A", "text": "Option 1" },
                { "label": "B", "text": "Option 2" },
                { "label": "C", "text": "Option 3" },
                { "label": "D", "text": "Option 4" }
            ],
            "answer": "D"
        }
    ]
}

If the correct answer is missing or cannot be identified,
use an empty string for "answer".

Return valid JSON only. Do not use Markdown.
`;
*/


  async function getAIResponse(Value) {
    console.log("API key loaded:", Boolean(APIKEY));
    const url = "https://api.groq.com/openai/v1/chat/completions";
    if (!APIKEY) {
      throw new Error("API key load nahi hui.");
    }
    const Data = {
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 3000,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: Value
        }
      ]
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APIKEY}`,
        },
        body: JSON.stringify(Data)
      });

      const result = await response.json();


      if (!response.ok) {
        throw new Error(
          result.error?.message || "API request failed."
        );
      }


      // AI ka response string mein
      const reply = result.choices[0].message.content;

      console.log("AI Reply String:", reply);

      // JSON string ko JavaScript object mein convert karo
      console.log("Finish reason:", result.choices[0].finish_reason);
      console.log("Usage:", result.usage);
      console.log("Response length:", reply.length);
      const data = JSON.parse(reply);

      //console.log("Parsed Object:", data);
      //console.log("MCQs Array:", data.mcqs);
      for (let i = 0; i < data.mcqs.length; i++) {
        console.log(data.mcqs[i].question);
        console.log(data.mcqs[i].options);
        console.log(data.mcqs[i].answer);
      }
      //console.log("Last 300 characters:", reply.slice(-300));
      setMcqs(data.mcqs);
      //data.mcqs[0].question;
      //console.log(data.mcqs[0].options);
      //console.log(data.mcqs[0].answer);

      return data;


    } catch (error) {
      console.error("Error:", error.message);
      throw error;
    }

  }





  async function Chat() {
    return await getAIResponse(ref1.current.value);
  }



  //data.mcqs[0].options);
  //console.log(data.mcqs[0].answer)

  if (showLanding) {
    return (
      <LandingDashboard
        onGetStarted={() => setShowLanding(false)}
      />
    );
  }

  return (
    <div>
      {!showQuiz && (
        <div>
          <nav className="Nav">
            <h3>Take-to-Quiz</h3>
           <a href = "LandingDashboard">Dashboard</a>
          </nav>

          <div className="Text-Area">
            <h2>Paste your text</h2>
            <textarea ref={ref1} />


            <button
              onClick={handleGenerate}
              disabled={Generate}
            >
              {Generate ? "Generating..." : "Generate Quiz"}
            </button>


          </div>
        </div>
      )}

      {showQuiz && (
        <div className="Full-Quiz-Container">
          <Quiz Mcqs={Mcqs} />
        </div>
      )}
    </div>
  );
}
export default App;
