
import "./LandingDashboard.css";

function LandingDashboard({ onGetStarted }) {
  return (
    <div className="landing-dashboard">
      <nav className="landing-nav">
        <h2 className="landing-logo">
          QuizNoma <span>AI</span>
        </h2>

        <span className="landing-badge">AI Powered</span>
      </nav>

      <main className="landing-main">
        <section className="landing-hero">
          <span className="landing-tag">SMART LEARNING STARTS HERE</span>

          <h1>
            Turn Your Notes
            <br />
            Into <span>Quizzes</span>
          </h1>

          <p>
            Transform your study material into interactive multiple-choice
            quizzes with AI. Practice smarter, test your knowledge, and
            track your performance.
          </p>

          <button
            className="landing-start-btn"
            onClick={onGetStarted}
          >
            Get Started <span>→</span>
          </button>
        </section>

        <section className="landing-how">
          <h2>How It Works</h2>
          <p className="landing-subtitle">
            Three simple steps to improve your preparation.
          </p>

          <div className="landing-cards">
            <div className="landing-card">
              <div className="landing-icon">📝</div>
              <h3>Your Study Notes</h3>
              <p>Paste your learning material into the text area.</p>
              <span className="landing-step">STEP 01</span>
            </div>

            <div className="landing-card">
              <div className="landing-icon">✨</div>
              <h3>AI-Generated MCQs</h3>
              <p>Generate multiple-choice questions and options from your notes.</p>
              <span className="landing-step">STEP 02</span>
            </div>

            <div className="landing-card">
              <div className="landing-icon">🎯</div>
              <h3>Test Your Knowledge</h3>
              <p>Attempt the quiz and check your score to review your preparation.</p>
              <span className="landing-step">STEP 03</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          Learn smarter. Practice better. <span>QuizNoma AI</span>
        </p>

        <div className="landing-social-links">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>

          <a
            href="https://www.linkedin.com/in/muhammadnouman028"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>

          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>

        <p className="landing-copyright">
          © 2026 QuizNoma AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default LandingDashboard;
