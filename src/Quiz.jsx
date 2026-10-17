import { useState } from 'react';
import './Quiz.css'
function Quiz({ Mcqs }) {
    const [activeMcqs, setActiveMcqs] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState([]);
    const [feedback, setFeedback] = useState("");
    const [showData, setShowData] = useState(false);


    const Next = () => {
        if (activeMcqs < Mcqs.length - 1) {
            setActiveMcqs(activeMcqs + 1);
            setFeedback("");
        }
    };

    const Previous = () => {
        if (activeMcqs > 0) {
            setActiveMcqs(activeMcqs - 1);
            setFeedback("");
        }
    };

    //const correctAnswer = Mcqs[activeMcqs]?.answer;
    //console.log(correctAnswer);


    const Select = (option) => {
        if (answered.includes(activeMcqs)) {
            return;
        }

        const currentQuestion = Mcqs[activeMcqs];

        if (option.label === currentQuestion?.answer) {
            setScore((prevScore) => prevScore + 1);
            setFeedback("Correct!");
        } else {
            const correctAnswer = currentQuestion?.options.find(
                (item) => item.label === currentQuestion?.answer
            );

            setFeedback(
                `Wrong! Correct answer: ${correctAnswer?.label} - ${correctAnswer?.text}`
            );
        }

        setAnswered((prev) => [...prev, activeMcqs]);
    };

    return (
        <div>
            {!showData ? (
                <>
                    <nav className="Nav">
                        <h3>Take-to-Quiz</h3>
                        <h5>Question {activeMcqs + 1} of {Mcqs.length}</h5>
                    </nav>
                    <div className="Pbox">
                        <div className="Cbox">
                        </div>
                    </div>

                    <div className="Score">
                        <p>Score: {score}/{Mcqs.length}</p>
                        <p>
                            Percentage: {((score / Mcqs.length) * 100).toFixed(0)}%
                        </p>
                        <h3>Time left: 0:18</h3>
                    </div>

                    {/*Mcqs.map((item, index) => (
                <div key={index}>
                    <h3>{index + 1}. {item.question}</h3>

                    {item.options.map((option, i) => (
                        <p key={i}>
                            {option.label} {option.text}
                        </p>
                    ))}

                    <p>Answer: {item.answer}</p>
                </div>
            ))*/}

                    <div className="Grid">
                        <div className="Box Question-Box">
                            <h3>{Mcqs[activeMcqs]?.question}</h3>
                        </div>

                        {Mcqs[activeMcqs]?.options.map((option, index) => (
                            <div className="Box Option-Box" key={index}>

                                <button onClick={() => Select(option)}>
                                    {option.label} {option.text}
                                </button>
                            </div>
                        ))}
                    </div>

                    {feedback && (
                        <h3>Correct answer: {feedback}</h3>
                    )}
                    <div className="Control">
                        <button onClick={Next}>Next</button>
                        <button onClick={Previous}>Previous</button>
                        <button  id = "submit" onClick={() => setShowData(true)}>Submit</button>
                    </div>
                </>
            ) : (
                <Result
                    Sc={score}
                    length={Mcqs.length}
                />
            )}
        </div>
    )
}



function Result(prop) {
    const percentage = prop.length > 0
        ? (prop.Sc / prop.length) * 100
        : 0;

    let message = "";

    if (percentage >= 80) {
        message = "Excellent! You have prepared very well.";
    } else if (percentage >= 60) {
        message = "Good! Your preparation is good, but keep practicing.";
    } else if (percentage >= 40) {
        message = "Average! You need more preparation and practice.";
    } else {
        message = "Keep practicing! You need more revision to improve your score.";
    }

    return (
        <div className="Result">
            <h1>Quiz Completed!</h1>

            <p>Score: {prop.Sc}</p>

            <p>Total Questions: {prop.length}</p>

            <p>Percentage: {percentage.toFixed(0)}%</p>

            <h3>{message}</h3>
        </div>
    );
}


export default Quiz;