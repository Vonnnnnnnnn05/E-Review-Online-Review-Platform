/**
 * Quiz Mode Page (Bonus Feature)
 * 
 * Auto-grading quiz with timer and score tracking.
 * Supports identification, multiple choice, and definition types.
 */
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import { FiArrowLeft, FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import LoadingSpinner from "../../components/LoadingSpinner";

const QuizMode = () => {
  const { reviewerId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [reviewer, setReviewer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reviewerDoc = await getDoc(doc(db, "reviewers", reviewerId));
        if (!reviewerDoc.exists()) {
          toast.error("Reviewer not found.");
          navigate(-1);
          return;
        }
        setReviewer({ id: reviewerDoc.id, ...reviewerDoc.data() });

        const questionsQuery = query(
          collection(db, "questions"),
          where("reviewerId", "==", reviewerId)
        );
        const questionsSnap = await getDocs(questionsQuery);
        const questionsData = questionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuestions(questionsData.sort(() => Math.random() - 0.5));
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reviewerId, navigate]);

  useEffect(() => {
    if (!submitted && questions.length > 0) {
      timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [submitted, questions.length]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    let correct = 0;
    questions.forEach((q) => {
      const userAnswer = (answers[q.id] || "").trim().toLowerCase();
      const correctAnswer = (q.answer || "").trim().toLowerCase();
      if (reviewer.type === "multiple_choice") {
        if (userAnswer === correctAnswer.toLowerCase()) correct++;
      } else {
        if (
          userAnswer === correctAnswer ||
          correctAnswer.includes(userAnswer) ||
          userAnswer.includes(correctAnswer)
        )
          correct++;
      }
    });

    setScore(correct);
    setSubmitted(true);

    try {
      await addDoc(collection(db, "scores"), {
        userId: currentUser.uid,
        reviewerId,
        score: correct,
        total: questions.length,
        timeSpent: timer,
        completedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving score:", error);
    }

    toast.success(`Quiz completed! Score: ${correct}/${questions.length}`);
  };

  if (loading) return <LoadingSpinner fullScreen={false} message="Loading quiz..." />;

  if (questions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <h3 className="font-semibold text-gray-900">No questions available</h3>
        <p className="text-sm text-gray-500 mt-1">This reviewer has no questions yet.</p>
        <button
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft /> Exit Quiz
        </button>
        <h2 className="text-lg font-bold text-black truncate">{reviewer?.title}</h2>
        <div className="inline-flex items-center gap-1.5 text-sm font-mono text-gray-600">
          <FiClock /> {formatTime(timer)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-300"
          style={{
            width: submitted
              ? "100%"
              : `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Results Screen */}
      {submitted ? (
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-black mb-4">Quiz Complete!</h2>
            <div className="w-28 h-28 rounded-full border-4 border-black flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-black">{percentage}%</span>
            </div>
            <p className="text-gray-700 mb-1">
              You got <strong>{score}</strong> out of <strong>{questions.length}</strong> correct
            </p>
            <p className="text-sm text-gray-500 mb-6">Time: {formatTime(timer)}</p>

            {/* Review Answers */}
            <div className="space-y-3 text-left mb-6">
              {questions.map((q, i) => {
                const userAnswer = (answers[q.id] || "").trim().toLowerCase();
                const correctAnswer = (q.answer || "").trim().toLowerCase();
                let isCorrect = false;
                if (reviewer.type === "multiple_choice") {
                  isCorrect = userAnswer === correctAnswer.toLowerCase();
                } else {
                  isCorrect =
                    userAnswer === correctAnswer ||
                    correctAnswer.includes(userAnswer) ||
                    userAnswer.includes(correctAnswer);
                }

                return (
                  <div
                    key={q.id}
                    className={`flex gap-3 items-start p-3 rounded-lg border ${
                      isCorrect ? "border-gray-300 bg-gray-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCorrect ? (
                        <FiCheckCircle className="text-black text-lg" />
                      ) : (
                        <FiXCircle className="text-red-500 text-lg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {i + 1}. {q.question}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Your answer: <strong>{answers[q.id] || "(no answer)"}</strong>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-red-600 mt-0.5">
                          Correct answer: <strong>{q.answer}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                onClick={() => navigate(-1)}
              >
                Back to Reviewer
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setCurrentIndex(0);
                  setScore(0);
                  setTimer(0);
                  setQuestions([...questions].sort(() => Math.random() - 0.5));
                }}
              >
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Question Screen */
        <div className="flex justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 w-full max-w-2xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <h3 className="text-lg font-semibold text-black mb-6">{currentQuestion.question}</h3>

            {/* Multiple Choice Options */}
            {reviewer?.type === "multiple_choice" && currentQuestion.choices ? (
              <div className="space-y-2 mb-6">
                {currentQuestion.choices.map((choice, i) => {
                  const letter = choice.charAt(0);
                  const isSelected = answers[currentQuestion.id] === letter;
                  return (
                    <button
                      key={i}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => handleAnswer(currentQuestion.id, letter)}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mb-6">
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Type your answer..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (currentIndex < questions.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                      }
                    }
                  }}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                Previous
              </button>
              {currentIndex < questions.length - 1 ? (
                <button
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                  onClick={handleSubmit}
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizMode;
