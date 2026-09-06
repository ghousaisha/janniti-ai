import { useEffect, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
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
  // CITIZEN NOTIFICATIONS
  // ====================================================

  const [notifications, setNotifications] =
    useState([]);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        notification.read !== true
    ).length;


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
  // LOAD CITIZEN NOTIFICATIONS IN REAL TIME
  // ====================================================

  useEffect(() => {

    if (
      page !== "citizen" ||
      !citizenPhone
    ) {
      setNotifications([]);
      return;
    }


    const phone =
      `+91${citizenPhone}`;


    const notificationsQuery =
      query(
        collection(db, "notifications"),
        where(
          "citizenPhone",
          "==",
          phone
        )
      );


    const unsubscribe =
      onSnapshot(
        notificationsQuery,
        (snapshot) => {

          const data =
            snapshot.docs.map(
              (notificationDoc) => ({
                id:
                  notificationDoc.id,
                ...notificationDoc.data(),
              })
            );


          // Sort newest notifications first.
          // We sort locally so Firestore does not
          // require an additional composite index.

          data.sort(
            (a, b) => {

              const timeA =
                a.createdAt?.toMillis
                  ? a.createdAt.toMillis()
                  : 0;

              const timeB =
                b.createdAt?.toMillis
                  ? b.createdAt.toMillis()
                  : 0;

              return timeB - timeA;
            }
          );


          setNotifications(data);

        },
        (error) => {

          console.error(
            "Notification listener error:",
            error
          );

        }
      );


    return () => unsubscribe();

  }, [
    page,
    citizenPhone,
  ]);


  // ====================================================
  // MARK NOTIFICATION AS READ
  // ====================================================

  const markNotificationAsRead =
    async (notificationId) => {

      try {

        await updateDoc(
          doc(
            db,
            "notifications",
            notificationId
          ),
          {
            read: true,
          }
        );

      } catch (error) {

        console.error(
          "Error marking notification as read:",
          error
        );

      }

    };


  // ====================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ====================================================

  const markAllNotificationsAsRead =
    async () => {

      try {

        const unread =
          notifications.filter(
            (notification) =>
              notification.read !== true
          );


        await Promise.all(
          unread.map(
            (notification) =>
              updateDoc(
                doc(
                  db,
                  "notifications",
                  notification.id
                ),
                {
                  read: true,
                }
              )
          )
        );

      } catch (error) {

        console.error(
          "Error marking notifications as read:",
          error
        );

      }

    };


  // ====================================================
  // FORMAT NOTIFICATION TIME
  // ====================================================

  const formatNotificationTime =
    (timestamp) => {

      if (
        !timestamp ||
        !timestamp.toDate
      ) {
        return "Just now";
      }


      const date =
        timestamp.toDate();


      const now =
        new Date();


      const difference =
        now.getTime() -
        date.getTime();


      const minutes =
        Math.floor(
          difference /
          (1000 * 60)
        );


      if (minutes < 1) {
        return "Just now";
      }


      if (minutes < 60) {
        return `${minutes} min ago`;
      }


      const hours =
        Math.floor(
          minutes / 60
        );


      if (hours < 24) {
        return `${hours} hr ago`;
      }


      const days =
        Math.floor(
          hours / 24
        );


      if (days === 1) {
        return "Yesterday";
      }


      return date.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );

    };


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

      setNotifications([]);

      setShowNotifications(false);

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


        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginTop: "5px",
            marginBottom: "15px",
          }}
        >

          <p
            style={{
              fontSize: "14px",
              color: "#666",
              margin: 0,
            }}
          >
            Logged in with mobile number:{" "}
            +91 {citizenPhone}
          </p>


          {/* =================================================
              NOTIFICATION BUTTON
          ================================================= */}

          <div
            style={{
              position: "relative",
            }}
          >

            <button
              type="button"
              onClick={() =>
                setShowNotifications(
                  (prev) => !prev
                )
              }
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1px solid #d8e0ea",
                background: "#fff",
                color: "#123b66",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >

              <span
                style={{
                  fontSize: "20px",
                  lineHeight: 1,
                }}
              >
                🔔
              </span>

              <span>
                Notifications
              </span>


              {unreadNotifications > 0 && (

                <span
                  style={{
                    minWidth: "21px",
                    height: "21px",
                    padding: "0 5px",
                    borderRadius: "20px",
                    background: "#d62828",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  {unreadNotifications}
                </span>

              )}

            </button>


            {/* =================================================
                NOTIFICATION PANEL
            ================================================= */}

            {showNotifications && (

              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "52px",
                  width: "380px",
                  maxWidth:
                    "calc(100vw - 30px)",
                  background: "#fff",
                  border:
                    "1px solid #d8e0ea",
                  borderRadius: "12px",
                  boxShadow:
                    "0 10px 30px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                    padding: "16px 18px",
                    borderBottom:
                      "1px solid #e5eaf0",
                  }}
                >

                  <div>

                    <strong
                      style={{
                        color: "#123b66",
                        fontSize: "16px",
                      }}
                    >
                      Notifications
                    </strong>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#71869f",
                        marginTop: "3px",
                      }}
                    >
                      Complaint status updates
                    </div>

                  </div>


                  {unreadNotifications >
                    0 && (

                    <button
                      type="button"
                      onClick={
                        markAllNotificationsAsRead
                      }
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        color: "#1769c2",
                        fontSize: "12px",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      Mark all read
                    </button>

                  )}

                </div>


                <div
                  style={{
                    maxHeight: "420px",
                    overflowY: "auto",
                  }}
                >

                  {notifications.length ===
                  0 ? (

                    <div
                      style={{
                        padding: "35px 20px",
                        textAlign: "center",
                        color: "#71869f",
                      }}
                    >

                      <div
                        style={{
                          fontSize: "30px",
                          marginBottom: "10px",
                        }}
                      >
                        🔔
                      </div>

                      <strong
                        style={{
                          display: "block",
                          color: "#123b66",
                          marginBottom: "5px",
                        }}
                      >
                        No notifications
                      </strong>

                      <span
                        style={{
                          fontSize: "13px",
                        }}
                      >
                        Updates about your complaints
                        will appear here.
                      </span>

                    </div>

                  ) : (

                    notifications.map(
                      (notification) => {

                        const isUnread =
                          notification.read !==
                          true;

                        const isResolved =
                          notification.status ===
                          "Resolved";

                        return (

                          <div
                            key={
                              notification.id
                            }
                            onClick={() => {

                              if (
                                isUnread
                              ) {
                                markNotificationAsRead(
                                  notification.id
                                );
                              }

                            }}
                            style={{
                              padding:
                                "16px 18px",
                              borderBottom:
                                "1px solid #edf1f5",
                              background:
                                isUnread
                                  ? "#f7fbff"
                                  : "#fff",
                              cursor:
                                isUnread
                                  ? "pointer"
                                  : "default",
                            }}
                          >

                            <div
                              style={{
                                display: "flex",
                                alignItems:
                                  "flex-start",
                                gap: "12px",
                              }}
                            >

                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius:
                                    "50%",
                                  background:
                                    isResolved
                                      ? "#e8f7f0"
                                      : "#eaf3ff",
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                  flexShrink: 0,
                                  fontSize: "17px",
                                }}
                              >
                                {isResolved
                                  ? "✓"
                                  : "↻"}
                              </div>


                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >

                                <div
                                  style={{
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    gap: "8px",
                                  }}
                                >

                                  <strong
                                    style={{
                                      color:
                                        isResolved
                                          ? "#16855b"
                                          : "#1769c2",
                                      fontSize:
                                        "14px",
                                    }}
                                  >
                                    {isResolved
                                      ? "Complaint Resolved"
                                      : "Complaint Being Processed"}
                                  </strong>


                                  {isUnread && (

                                    <span
                                      style={{
                                        width:
                                          "8px",
                                        height:
                                          "8px",
                                        borderRadius:
                                          "50%",
                                        background:
                                          "#1769c2",
                                        flexShrink: 0,
                                        marginTop:
                                          "5px",
                                      }}
                                    />

                                  )}

                                </div>


                                <p
                                  style={{
                                    margin:
                                      "7px 0",
                                    color:
                                      "#3f556d",
                                    fontSize:
                                      "13px",
                                    lineHeight:
                                      "1.5",
                                  }}
                                >
                                  {
                                    notification.message
                                  }
                                </p>


                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap: "10px",
                                    flexWrap:
                                      "wrap",
                                    fontSize:
                                      "11px",
                                    color:
                                      "#71869f",
                                  }}
                                >

                                  {notification.area && (

                                    <span>
                                      📍{" "}
                                      {
                                        notification.area
                                      }
                                    </span>

                                  )}


                                  {notification.category && (

                                    <span>
                                      {
                                        notification.category
                                      }
                                    </span>

                                  )}


                                  <span>
                                    {
                                      formatNotificationTime(
                                        notification.createdAt
                                      )
                                    }
                                  </span>

                                </div>

                              </div>

                            </div>

                          </div>

                        );

                      }
                    )

                  )}

                </div>

              </div>

            )}

          </div>

        </div>


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


          {/* =================================================
              SPEAK YOUR COMPLAINT
          ================================================= */}

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
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "8px 26px 8px 10px",
              minHeight: "64px",
              borderRadius: "12px",
              border: "none",
              background: "#1769c2",
              color: "#fff",
              fontSize: "18px",
              fontWeight: "600",
              cursor:
                listening || loading
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                "0 3px 8px rgba(0, 0, 0, 0.12)",
            }}
          >

            <span
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f4f8fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >

              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >

                <path
                  d="M12 15.5C14.21 15.5 16 13.71 16 11.5V6.5C16 4.29 14.21 2.5 12 2.5C9.79 2.5 8 4.29 8 6.5V11.5C8 13.71 9.79 15.5 12 15.5Z"
                  fill="#1769c2"
                />

                <path
                  d="M19 11.5C19 15.37 15.87 18.5 12 18.5C8.13 18.5 5 15.37 5 11.5"
                  stroke="#1769c2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M12 18.5V21.5"
                  stroke="#1769c2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M9 21.5H15"
                  stroke="#1769c2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

              </svg>

            </span>


            <span>
              {listening
                ? "Listening..."
                : "Speak Your Complaint"}
            </span>

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