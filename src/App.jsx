
<div className="Text-Area workspace">
  <div className="workspace-header">
    <div>
      <span className="workspace-eyebrow">YOUR AI STUDY PARTNER</span>
      <h2>QuizNomaAI Assistant</h2>
      <p>
        Turn your study material into interactive quizzes.
        Paste your notes or existing MCQs to get started.
      </p>
    </div>

    <div className="workspace-status">
      <span className="status-dot"></span>
      AI Workspace
    </div>
  </div>

  <div className="workspace-features">
    <div className="workspace-feature">
      <span>📝</span>
      <div>
        <h4>Notes to MCQs</h4>
        <p>Generate questions from your study material.</p>
      </div>
    </div>

    <div className="workspace-feature">
      <span>📚</span>
      <div>
        <h4>Existing MCQs</h4>
        <p>Convert your questions into an interactive quiz.</p>
      </div>
    </div>

    <div className="workspace-feature">
      <span>⚡</span>
      <div>
        <h4>Batch Processing</h4>
        <p>Process up to 10 questions per AI response.</p>
      </div>
    </div>
  </div>

  <div className="workspace-input-header">
    <label htmlFor="study-material">Your study material</label>
    <span>{sourceText.length} characters</span>
  </div>

  <textarea
    id="study-material"
    ref={ref1}
    value={sourceText}
    onChange={(event) => setSourceText(event.target.value)}
    placeholder={`Paste your notes or MCQs here...

Example:

1. What is JavaScript?
A) A programming language
B) An operating system
C) A database
D) A web browser
Answer: A

You can also paste notes or paragraphs.
QuizNomaAI will process the material into quiz questions.`}
  />

  <div className="workspace-tips">
    <h4>💡 Tips for better results</h4>
    <ul>
      <li>Paste complete questions and options when using existing MCQs.</li>
      <li>Include answers if you want to preserve the original correct answers.</li>
      <li>For large sets, use Next Batch to continue processing.</li>
    </ul>
  </div>

  {errorMessage && (
    <div className="workspace-error" role="alert">
      <strong>Unable to continue</strong>
      <p>{errorMessage}</p>
    </div>
  )}

  <div className="workspace-actions">
    <button
      className="workspace-clear"
      onClick={() => {
        setSourceText('');
        setErrorMessage('');
        if (ref1.current) ref1.current.value = '';
      }}
      disabled={isLoading || !sourceText}
    >
      Clear Text
    </button>

    <button
      className="workspace-generate"
      onClick={handleGenerate}
      disabled={isLoading || !sourceText.trim()}
    >
      {isLoading ? 'Preparing Your Quiz...' : 'Generate Quiz →'}
    </button>
  </div>

  <p className="workspace-note">
    Large inputs are processed in batches to help manage requests.
    AI service limits and network errors may still occur.
  </p>
</div>
