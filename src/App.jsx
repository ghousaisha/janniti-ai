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
import Chatbot from "./Chatbot";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});


// ======================================================
// DEMO OTP
// ======================================================

const DEMO_OTP = "123456";


function App() {

  const [problem, setProblem] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [citizenPhone, setCitizenPhone] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [listening, setListening] =
    useState(false);


  // ====================================================
  // PAGE NAVIGATION
  // ====================================================

  const [page, setPage] =
    useState("home");


  // ====================================================
  // DEMO OTP
  // ====================================================

  const [otp, setOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [otpLoading, setOtpLoading] =
    useState(false);

  const [otpError, setOtpError] =
    useState("");


  // ====================================================
  // POLICYMAKER AUTHENTICATION
  // ====================================================

  const [user, setUser] =
    useState(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loginLoading, setLoginLoading] =
    useState(false);

  const [loginError, setLoginError] =
    useState("");


  // ====================================================
  // CHECK POLICYMAKER AUTHENTICATION
  // ====================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
        }
      );

    return () => unsubscribe();

  }, []);


  // ====================================================
  // VOICE INPUT
  // ====================================================

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


    const recognition =
      new SpeechRecognition();


    recognition.lang = "hi-IN";

    recognition.interimResults =
      false;

    recognition.continuous =
      false;


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


      if (
        event.error ===
        "not-allowed"
      ) {

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


  // ====================================================
  // SEND DEMO OTP
  // ====================================================

  const sendOTP = () => {

    setOtpError("");

    setOtp("");


    if (
      citizenPhone.length !== 10 ||
      !/^\d{10}$/.test(citizenPhone)
    ) {

      setOtpError(
        "Please enter a valid 10-digit mobile number."
      );

      return;
    }


    setOtpLoading(true);


    // Demo OTP does not send a real SMS.
    // The OTP is displayed on screen.

    setTimeout(() => {

      setOtpSent(true);

      setPage("citizen-otp");

      setOtpLoading(false);

    }, 500);

  };


  // ====================================================
  // VERIFY DEMO OTP
  // ====================================================

  const verifyOTP = () => {

    setOtpError("");


    if (!otp || otp.length !== 6) {

      setOtpError(
        "Please enter the 6-digit OTP."
      );

      return;
    }


    setOtpLoading(true);


    setTimeout(() => {

      if (otp !== DEMO_OTP) {

        setOtpError(
          "Invalid OTP. For this demo, use 123456."
        );

        setOtpLoading(false);

        return;
      }


      // Save citizen phone for chatbot
      localStorage.setItem(
        "citizenPhone",
        `+91${citizenPhone}`
      );


      setOtp("");

      setOtpSent(false);

      setPage("citizen");

      setOtpLoading(false);

    }, 500);

  };


  // ====================================================
  // SUBMIT CITIZEN FEEDBACK
  // ====================================================

  const handleSubmit = async (e) => {

    e.preventDefault();


    if (!problem || !location) {

      alert(
        "Please fill in both fields."
      );

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


      const aiData =
        JSON.parse(
          response.text
        );


      console.log(
        "Gemini Analysis:",
        aiData
      );


      await addDoc(
        collection(
          db,
          "feedback"
        ),
        {

          problem:
            problem,

          location:
            location,

          issue:
            aiData.issue,

          category:
            aiData.category,

          amrutCategory:
            aiData.amrutCategory,

          severity:
            aiData.severity,

          citizenPhone:
            `+91${citizenPhone}`,

          status:
            "Pending",

          archived:
            false,

          dashboardVisible:
            true,

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


  // ====================================================
  // POLICYMAKER LOGIN
  // ====================================================

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


      setEmail("");

      setPassword("");

      setPage("dashboard");


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


  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = async () => {

    try {

      await signOut(auth);


      localStorage.removeItem(
        "citizenPhone"
      );


      setCitizenPhone("");

      setPage("home");


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  };


  // ====================================================
  // POLICYMAKER DASHBOARD
  // ====================================================

  if (page === "dashboard") {

    if (!user) {

      setPage("home");

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

          <button
            onClick={
              handleLogout
            }
          >
            Logout
          </button>


          <button
            onClick={() =>
              setPage("home")
            }
            style={{
              marginLeft: "10px",
            }}
          >
            Back to Home
          </button>

        </div>

      </>

    );

  }


  // ====================================================
  // HOME / LOGIN
  // ====================================================

  if (page === "home") {

    return (

      <div className="container">

        <h1>
          JAN NITI
        </h1>


        <p>
          Citizen Feedback → Better Development Decisions
        </p>


        {/* =================================================
            CITIZEN LOGIN
        ================================================= */}

        <div
          style={{
            marginTop: "40px",
            padding: "28px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >

          <h2>
            Citizen Login
          </h2>


          <p>
            Enter your mobile number to
            access the citizen portal.
          </p>


          <label>
            Mobile Number
          </label>


          <input
            type="tel"
            placeholder="Enter 10-digit mobile number"
            value={citizenPhone}
            onChange={(e) =>
              setCitizenPhone(
                e.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            maxLength="10"
          />


          {otpError && (
            <p
              style={{
                color: "#c62828",
                fontSize: "14px",
              }}
            >
              {otpError}
            </p>
          )}


          <button
            type="button"
            onClick={sendOTP}
            disabled={
              otpLoading
            }
            style={{
              marginTop: "15px",
            }}
          >

            {otpLoading
              ? "Generating OTP..."
              : "Send Demo OTP"}

          </button>


          <p
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "#666",
            }}
          >
            Demo mode: no SMS will be sent.
          </p>

        </div>


        {/* =================================================
            DIVIDER
        ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            margin: "30px 0",
            color: "#777",
          }}
        >

          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#ddd",
            }}
          />


          <span>
            Policymaker Access
          </span>


          <div
            style={{
              flex: 1,
              height: "1px",
              background: "#ddd",
            }}
          />

        </div>


        {/* =================================================
            POLICYMAKER LOGIN
        ================================================= */}

        <div
          style={{
            padding: "28px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >

          <h2>
            Policymaker Login
          </h2>


          <p>
            Access development priorities
            and citizen feedback.
          </p>


          <form
            onSubmit={
              handleLogin
            }
          >

            <label>
              Email
            </label>


            <input
              type="email"
              placeholder="Enter policymaker email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
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
                setPassword(
                  e.target.value
                )
              }
            />


            {loginError && (
              <p
                style={{
                  color: "#c62828",
                  fontSize: "14px",
                }}
              >
                {loginError}
              </p>
            )}


            <button
              type="submit"
              disabled={
                loginLoading
              }
              style={{
                marginTop: "15px",
              }}
            >

              {loginLoading
                ? "Signing in..."
                : "Login"}

            </button>

          </form>

        </div>

      </div>

    );

  }


  // ====================================================
  // DEMO OTP VERIFICATION
  // ====================================================

  if (page === "citizen-otp") {

    return (

      <div className="container">

        <h1>
          JAN NITI
        </h1>


        <p>
          Verify Your Mobile Number
        </p>


        <div
          style={{
            marginTop: "30px",
            padding: "28px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >

          <p>
            Demo OTP for:
          </p>


          <strong>
            +91 {citizenPhone}
          </strong>


          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#f1f5f9",
              border: "1px solid #d8dee8",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >

            <span
              style={{
                display: "block",
                fontSize: "13px",
                color: "#666",
                marginBottom: "5px",
              }}
            >
              Your Demo OTP
            </span>


            <strong
              style={{
                fontSize: "24px",
                letterSpacing: "5px",
              }}
            >
              {DEMO_OTP}
            </strong>

          </div>


          <label
            style={{
              marginTop: "20px",
            }}
          >
            Enter OTP
          </label>


          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            maxLength="6"
          />


          {otpError && (
            <p
              style={{
                color: "#c62828",
                fontSize: "14px",
              }}
            >
              {otpError}
            </p>
          )}


          <button
            type="button"
            onClick={
              verifyOTP
            }
            disabled={
              otpLoading
            }
            style={{
              marginTop: "15px",
            }}
          >

            {otpLoading
              ? "Verifying..."
              : "Verify Demo OTP"}

          </button>


          <button
            type="button"
            onClick={() => {

              setOtp("");

              setOtpError("");

              setOtpSent(false);

              setPage("home");

            }}
            style={{
              marginTop: "10px",
            }}
          >
            Change Number
          </button>

        </div>

      </div>

    );

  }


  // ====================================================
  // SUBMITTED SCREEN
  // ====================================================

  if (submitted) {

    return (

      <div className="container">

        <h1>
          JAN NITI
        </h1>


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


  // ====================================================
  // CITIZEN PORTAL
  // ====================================================

  if (page === "citizen") {

    return (

      <div className="container">

        <h1>
          JAN NITI
        </h1>


        <p>
          Citizen Portal
        </p>


        <p
          style={{
            fontSize: "14px",
            color: "#666",
          }}
        >
          Logged in with mobile number:{" "}
          +91 {citizenPhone}
        </p>


        {/* =================================================
            NORMAL COMPLAINT FORM
        ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
        >

          <label>
            What is the problem in your area?
          </label>


          <textarea
            placeholder="Example: Roads are badly damaged and need repair."
            value={problem}
            onChange={(e) =>
              setProblem(
                e.target.value
              )
            }
          />


          <button
            type="button"
            onClick={
              startVoiceInput
            }
            disabled={
              listening ||
              loading
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
              setLocation(
                e.target.value
              )
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
              loading ||
              listening
            }
          >

            {loading
              ? "Analyzing..."
              : "Submit Feedback"}

          </button>

        </form>


        {/* =================================================
            JAN NITI CHATBOT
        ================================================= */}

        <Chatbot />


        {/* =================================================
            CITIZEN ACTIONS
        ================================================= */}

        <div
          style={{
            marginTop: "30px",
          }}
        >

          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            Logout
          </button>


          <button
            type="button"
            onClick={() =>
              setPage("home")
            }
            style={{
              marginLeft: "10px",
            }}
          >
            Back to Home
          </button>

        </div>

      </div>

    );

  }


  return null;
}


export default App;