
import './App.css'
import { useState, useRef } from 'react';
import Quiz from './Quiz.jsx'
import LandingDashboard from "./LandingDashboard";

function App() {
  const [showQuiz, setShowQuiz] = useState(false);
  const ref1 = useRef(null);
  const [Mcqs, setMcqs] = useState([]);
  const [showLanding, setShowLanding] = useState(true);

  async function handleGenerate() {
    if (ref1.current.value.trim() === "") {
      console.log("Please enter MCQs first.");
      return;
    }

    const result = await Chat();

    // Quiz sirf successful response par open hoga
    if (result && Array.isArray(result.mcqs)) {
      setShowQuiz(true);
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

    6. PARTIAL COMPLETION RULES

- Prioritize returning complete, valid MCQs over completing
  the entire requested quantity in one response.

- If the requested quantity is too large for the available
  output budget, return as many complete MCQs as possible.

- Never intentionally return an empty result when useful,
  complete MCQs can be generated.

- Never return a partially written question or incomplete options.

- Always return valid JSON matching the required schema.

- Never claim that the requested quantity is complete if
  fewer MCQs were returned.

- Preserve the original questions and answers when processing
  existing MCQs.

- Do not invent missing answers when processing existing MCQs.
  `;

  async function getAIResponse(Value) {
    console.log("API key loaded:", Boolean(APIKEY));

    const url = "https://api.groq.com/openai/v1/chat/completions";

    if (!APIKEY) {
      console.error("API key is not loaded.");
      return null;
    }

    const Data = {
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 8192,
      reasoning_effort: "low",
      response_format: {
        type: "json_object"
      },
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
        console.error(
          "API Error:",
          result.error?.message || "Request failed."
        );
        return null;
      }

      // AI response aur usage details
      const choice = result.choices?.[0];

      if (!choice) {
        console.error("AI response is missing.");
        return null;
      }

      const reply = choice.message?.content;

      console.log("AI Reply String:", reply);
      console.log("Finish reason:", choice.finish_reason);
      console.log("Usage:", result.usage);
      console.log("Response length:", reply?.length ?? 0);

      // Incomplete response ko parse nahi karna
      if (choice.finish_reason === "length") {
        console.error(
          "AI response incomplete. Token limit reached. Please retry."
        );
        return null;
      }

      if (!reply || !reply.trim()) {
        console.error("AI returned an empty response.");
        return null;
      }

      // JSON string ko JavaScript object mein convert karna
      let data;

      try {
        data = JSON.parse(reply);
      } catch (error) {
        console.error("Invalid JSON received:", error.message);
        return null;
      }

      // Response structure validate karna
      if (!data || !Array.isArray(data.mcqs)) {
        console.error("Invalid response: mcqs array is missing.");
        return null;
      }

      // MCQs console mein check karna
      for (let i = 0; i < data.mcqs.length; i++) {
        console.log(data.mcqs[i].question);
        console.log(data.mcqs[i].options);
        console.log(data.mcqs[i].answer);
      }

      // State sirf valid response milne par update hogi
      setMcqs(data.mcqs);

      return data;

    } catch (error) {
      console.error("Error:", error.message);
      return null;
    }
  }

  async function Chat() {
    if (ref1.current.value.trim() === "") {
      console.log("Please enter MCQs first.");
      return null;
    }

    return await getAIResponse(ref1.current.value);
  }

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
            <h5>Dashboard</h5>
          </nav>

          <div className="Text-Area">
            <h2>Paste your text</h2>
            <textarea ref={ref1} />
            <button onClick={handleGenerate}>
              Generate Quiz
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
