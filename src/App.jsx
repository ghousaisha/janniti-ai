import { useEffect, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { db, auth } from "./firebase";
import Dashboard from "./Dashboard";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

function App() {
  const [problem, setProblem] = useState("");
  const [location, setLocation] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // --------------------------------------------------
  // CHECK AUTHENTICATION
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------
  // VOICE INPUT
  // --------------------------------------------------

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setProblem((prev) =>
        prev
          ? `${prev} ${transcript}`
          : transcript
      );
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (event.error === "not-allowed") {
        alert(
          "Microphone permission is required for voice input."
        );
      } else {
        alert(
          "Could not capture voice. Please try again."
        );
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  // --------------------------------------------------
  // SUBMIT CITIZEN FEEDBACK
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!problem || !location) {
      alert("Please fill in both fields.");
      return;
    }

    try {
      setLoading(true);

      const models = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
      ];

      let response;
      let lastError;

      for (const model of models) {
        try {
          console.log(
            `Trying Gemini model: ${model}`
          );

          response =
            await ai.models.generateContent({
              model: model,

              contents: `
You are an AI system for JanNiti, a civic governance platform.

Analyze this citizen complaint:

Complaint: "${problem}"
Location: "${location}"

Identify the specific issue described by the citizen.

Then classify it into ONE civic service category from this list:

- Roads & Urban Mobility
- Water Supply
- Sewerage & Drainage
- Solid Waste Management
- Street Lighting & Public Amenities
- Parks, Green Spaces & Water Bodies
- Public Health, Sanitation & Animal Services

Also determine whether the complaint maps to an official AMRUT 2.0 project category.

Official AMRUT 2.0 project categories are ONLY:

- Water Supply
- Sewerage & Septage Management
- Water Body Rejuvenation
- Parks & Green Space Development

If the complaint does not directly correspond to an AMRUT 2.0 category, return:
"Not Applicable"

Determine severity:

- Low
- Medium
- High

Return ONLY valid JSON in this exact format:

{
  "issue": "specific issue",
  "category": "one civic service category",
  "amrutCategory": "one AMRUT 2.0 category or Not Applicable",
  "severity": "Low"
}
              `,

              config: {
                responseMimeType:
                  "application/json",
              },
            });

          console.log(
            `Success with ${model}`
          );

          break;
        } catch (error) {
          console.warn(
            `${model} failed:`,
            error
          );

          lastError = error;
          response = null;
        }
      }

      if (!response) {
        throw lastError;
      }

      const aiData = JSON.parse(
        response.text
      );

      console.log(
        "Gemini Analysis:",
        aiData
      );

      await addDoc(
        collection(db, "feedback"),
        {
          problem: problem,
          location: location,
          issue: aiData.issue,
          category: aiData.category,
          amrutCategory:
            aiData.amrutCategory,
          severity: aiData.severity,
          createdAt:
            serverTimestamp(),
        }
      );

      setSubmitted(true);
      setProblem("");
      setLocation("");

    } catch (error) {
      console.error(
        "Gemini/Firebase Error:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // POLICYMAKER LOGIN
  // --------------------------------------------------

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");

    if (!email || !password) {
      setLoginError(
        "Please enter email and password."
      );
      return;
    }

    try {
      setLoginLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setShowLogin(false);
      setShowDashboard(true);

      setEmail("");
      setPassword("");

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setLoginError(
        `Login failed: ${error.code}`
      );

    } finally {
      setLoginLoading(false);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setShowDashboard(false);
      setShowLogin(false);

    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // --------------------------------------------------
  // PROTECTED DASHBOARD
  // --------------------------------------------------

  if (showDashboard) {
    if (!user) {
      setShowDashboard(false);
      setShowLogin(true);

      return null;
    }

    return (
      <>
        <Dashboard />

        <div
          className="container"
          style={{
            marginTop: "20px",
            marginBottom: "30px",
          }}
        >
          <button onClick={handleLogout}>
            Logout
          </button>

          <button
            onClick={() =>
              setShowDashboard(false)
            }
            style={{
              marginLeft: "10px",
            }}
          >
            Back to Citizen Portal
          </button>
        </div>
      </>
    );
  }

  // --------------------------------------------------
  // POLICYMAKER LOGIN SCREEN
  // --------------------------------------------------

  if (showLogin) {
    return (
      <div className="container">

        <h1>JAN NITI</h1>

        <p>
          Policymaker Access
        </p>

        <form onSubmit={handleLogin}>

          <label>
            Policymaker Email
          </label>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {loginError && (
            <p
              style={{
                color: "red",
              }}
            >
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
          >
            {loginLoading
              ? "Signing in..."
              : "Login"}
          </button>

          <button
            type="button"
            onClick={() =>
              setShowLogin(false)
            }
            style={{
              marginTop: "10px",
            }}
          >
            Back to Citizen Portal
          </button>

        </form>

      </div>
    );
  }

  // --------------------------------------------------
  // SUBMITTED SCREEN
  // --------------------------------------------------

  if (submitted) {
    return (
      <div className="container">

        <h1>JAN NITI</h1>

        <p>
          Citizen Feedback → Better Development Decisions
        </p>

        <div className="success">

          <h2>
            Feedback Submitted
          </h2>

          <p>
            Your feedback has been analyzed
            and recorded.
          </p>

          <button
            onClick={() =>
              setSubmitted(false)
            }
          >
            Submit Another
          </button>

        </div>

      </div>
    );
  }

  // --------------------------------------------------
  // CITIZEN PORTAL
  // --------------------------------------------------

  return (
    <div className="container">

      <h1>JAN NITI</h1>

      <p>
        Citizen Feedback → Better Development Decisions
      </p>

      <form onSubmit={handleSubmit}>

        <label>
          What is the problem in your area?
        </label>

        <textarea
          placeholder="Example: Roads are badly damaged and need repair."
          value={problem}
          onChange={(e) =>
            setProblem(e.target.value)
          }
        />

        <button
          type="button"
          onClick={startVoiceInput}
          disabled={
            listening || loading
          }
          style={{
            marginTop: "10px",
            marginBottom: "15px",
          }}
        >
          {listening
            ? "Listening..."
            : "Speak Your Complaint"}
        </button>

        {listening && (
          <p>
            Speak clearly in Hindi or Hinglish...
          </p>
        )}

        <label>
          Select your area
        </label>

        <select
          value={location}
          onChange={(e) =>
            setLocation(e.target.value)
          }
        >
          <option value="">
            Select location
          </option>

          <option value="Rau">
            Rau
          </option>

          <option value="Vijay Nagar">
            Vijay Nagar
          </option>

          <option value="Khajrana">
            Khajrana
          </option>

          <option value="Palasia">
            Palasia
          </option>

          <option value="Bhawarkua">
            Bhawarkua
          </option>
        </select>

        <button
          type="submit"
          disabled={
            loading || listening
          }
        >
          {loading
            ? "Analyzing..."
            : "Submit Feedback"}
        </button>

      </form>

      {/* --------------------------------------------- */}
      {/* POLICYMAKER ACCESS */}
      {/* --------------------------------------------- */}

      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop:
            "1px solid #ddd",
        }}
      >

        <button
          type="button"
          onClick={() =>
            setShowLogin(true)
          }
        >
          Policymaker Login
        </button>

      </div>

    </div>
  );
}

export default App;