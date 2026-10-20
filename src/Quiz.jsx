
import { useState } from 'react';
import './Quiz.css';

function Quiz({
  Mcqs,
  onNextBatch,
  isLoading,
  hasMore,
  errorMessage
}) {
  const [activeMcqs, setActiveMcqs] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [showData, setShowData] = useState(false);

  const currentQuestion = Mcqs[activeMcqs];
  const allAnswered = Mcqs.every((_, index) =>
  answered.includes(index)
);
  const isLastQuestion = activeMcqs === Mcqs.length - 1;

  const Next = () => {
    if (activeMcqs < Mcqs.length - 1) {
      setActiveMcqs((previous) => previous + 1);
      setFeedback('');
    }
  };

  const Previous = () => {
    if (activeMcqs > 0) {
      setActiveMcqs((previous) => previous - 1);
      setFeedback('');
    }
  };

  const Select = (option) => {
    if (answered.includes(activeMcqs)) {
      return;
    }

    if (option.label === currentQuestion?.answer) {
      setScore((previous) => previous + 1);
      setFeedback('Correct!');
    } else {
      const correctAnswer = currentQuestion?.options.find(
        (item) => item.label === currentQuestion?.answer
      );

      setFeedback(
        `Wrong! Correct answer: ${
          correctAnswer
            ? `${correctAnswer.label} - ${correctAnswer.text}`
            : 'Answer not provided'
        }`
      );
    }

    setAnswered((previous) => [...previous, activeMcqs]);
  };

  const loadNextBatch = async () => {
  if (!allAnswered || isLoading || !hasMore) {
    console.log('Button blocked:', {
      allAnswered,
      isLoading,
      hasMore
    });
    return;
  }

  const oldLength = Mcqs.length;

  try {
    const addedCount = await onNextBatch();

    console.log('Added MCQs:', addedCount);

    if (addedCount > 0) {
      setActiveMcqs(oldLength);
      setFeedback('');
    }
  } catch (error) {
    console.error('Loading next batch failed:', error);
  }
};
  return (
    <div>
      {!showData ? (
        <>
          <nav className="Nav">
            <h3>QuizNomaAI</h3>
            <h5>
              Question {activeMcqs + 1} of {Mcqs.length}
            </h5>
          </nav>

          <div className="Pbox">
            <div className="Cbox"></div>
          </div>

          <div className="Score">
            <p>
              Score: {score}/{Mcqs.length}
            </p>

            <p>
              Percentage:{' '}
              {Mcqs.length > 0
                ? ((score / Mcqs.length) * 100).toFixed(0)
                : 0}%
            </p>
          </div>

          <div className="Grid">
            <div className="Box Question-Box">
              <h3>{currentQuestion?.question}</h3>
            </div>

            {currentQuestion?.options.map((option, index) => (
              <div className="Box Option-Box" key={index}>
                <button
                  onClick={() => Select(option)}
                  disabled={answered.includes(activeMcqs)}
                >
                  {option.label} {option.text}
                </button>
              </div>
            ))}
          </div>

          {feedback && <h3>{feedback}</h3>}

          {errorMessage && <p>{errorMessage}</p>}

          <div className="Control">
            <button
              onClick={Previous}
              disabled={activeMcqs === 0}
            >
              Previous
            </button>

            <button
              onClick={Next}
              disabled={isLastQuestion}
            >
              Next
            </button>

            {isLastQuestion && hasMore && (
              <button
                onClick={loadNextBatch}
                disabled={!allAnswered || isLoading}
              >
                {isLoading
                  ? 'Loading next batch...'
                  : 'Next Batch'}
              </button>
            )}

            <button onClick={() => setShowData(true)}>
              Submit Quiz
            </button>
          </div>

          {isLastQuestion && hasMore && !allAnswered && (
            <p>
              Next Batch unlock karne ke liye current batch ke
              tamam questions answer karo.
            </p>
          )}

          {isLastQuestion && !hasMore && (
            <p>Mazeed questions available nahi hain.</p>
          )}
        </>
      ) : (
        <Result Sc={score} length={Mcqs.length} />
      )}
    </div>
  );
}

function Result({ Sc, length }) {
  const percentage = length > 0 ? (Sc / length) * 100 : 0;

  let message = '';

  if (percentage >= 80) {
    message = 'Excellent! You have prepared very well.';
  } else if (percentage >= 60) {
    message = 'Good! Your preparation is good, but keep practicing.';
  } else if (percentage >= 40) {
    message = 'Average! You need more preparation and practice.';
  } else {
    message = 'Keep practicing! You need more revision to improve your score.';
  }

  return (
    <div className="Result">
      <h1>Quiz Completed!</h1>
      <p>Score: {Sc}</p>
      <p>Total Questions: {length}</p>
      <p>Percentage: {percentage.toFixed(0)}%</p>
      <h3>{message}</h3>
    </div>
  );
}

export default Quiz;
