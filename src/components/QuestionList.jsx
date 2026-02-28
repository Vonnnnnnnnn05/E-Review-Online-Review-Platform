/**
 * QuestionList Component
 * 
 * Renders a list of questions for a given reviewer.
 * Supports identification, multiple choice, and definition types.
 */
import "./QuestionList.css";

const QuestionList = ({ questions, type }) => {
  if (!questions || questions.length === 0) {
    return (
      <div className="empty-state">
        <p>No questions found for this reviewer.</p>
      </div>
    );
  }

  return (
    <div className="question-list">
      {questions.map((q, index) => (
        <div className="question-item" key={q.id || index}>
          <div className="question-number">{index + 1}</div>
          <div className="question-content">
            {/* Identification & Multiple Choice */}
            {(type === "identification" || type === "multiple_choice") && (
              <>
                <p className="question-text">{q.question}</p>
                {type === "multiple_choice" && q.choices && (
                  <ul className="question-choices">
                    {q.choices.map((choice, i) => (
                      <li
                        key={i}
                        className={`choice ${
                          choice.startsWith(q.answer) ? "correct" : ""
                        }`}
                      >
                        {choice}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="question-answer">
                  <strong>Answer:</strong> {q.answer}
                </div>
              </>
            )}

            {/* Definition of Terms */}
            {type === "definition" && (
              <>
                <p className="question-text">
                  <strong>{q.question}</strong>
                </p>
                <div className="question-answer">{q.answer}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionList;
