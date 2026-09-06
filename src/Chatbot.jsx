import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import { db } from "./firebase";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

// =====================================================
// JAN NITI ROBOT ICON
// =====================================================

function RobotIcon({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Antenna */}
      <line
        x1="50"
        y1="14"
        x2="50"
        y2="24"
        stroke="#4fdcff"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <circle
        cx="50"
        cy="10"
        r="6"
        fill="#4fdcff"
      />

      {/* Robot head */}
      <rect
        x="18"
        y="23"
        width="64"
        height="50"
        rx="17"
        fill="#ffffff"
      />

      {/* Face screen */}
      <rect
        x="26"
        y="31"
        width="48"
        height="33"
        rx="11"
        fill="#18345f"
      />

      {/* Left eye */}
      <circle
        cx="41"
        cy="46"
        r="4"
        fill="#4fdcff"
      />

      {/* Right eye */}
      <circle
        cx="59"
        cy="46"
        r="4"
        fill="#4fdcff"
      />

      {/* Smile */}
      <path
        d="M42 53 Q50 61 58 53"
        fill="none"
        stroke="#4fdcff"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Left ear */}
      <rect
        x="11"
        y="39"
        width="9"
        height="19"
        rx="4.5"
        fill="#ffffff"
      />

      {/* Right ear */}
      <rect
        x="80"
        y="39"
        width="9"
        height="19"
        rx="4.5"
        fill="#ffffff"
      />

      {/* Body */}
      <path
        d="M31 74 Q50 65 69 74 L73 91 H27 Z"
        fill="#ffffff"
      />

      {/* Chest light */}
      <circle
        cx="50"
        cy="79"
        r="5"
        fill="#1f4f82"
      />

      {/* Small chest line */}
      <rect
        x="40"
        y="87"
        width="20"
        height="3"
        rx="1.5"
        fill="#d7e6f5"
      />
    </svg>
  );
}


// =====================================================
// CHATBOT
// =====================================================

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text:
        "Namaste! I am the JanNiti Citizen Assistant. Tell me about a problem affecting your area.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [conversationData, setConversationData] =
    useState({
      problem: "",
      location: "",
      issue: "",
      category: "",
      amrutCategory: "",
      severity: "",
      complete: false,
    });


  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      text,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const conversation = [
        ...messages,
        userMessage,
      ];

      const conversationText = conversation
        .map(
          (message) =>
            `${message.role === "user" ? "Citizen" : "JanNiti"}: ${message.text}`
        )
        .join("\n");

      const response =
        await ai.models.generateContent({
          model: "gemini-3.7-flash",

          contents: `
You are the JanNiti Citizen Assistant.

JanNiti is a civic development platform.

Your job is to:

1. Understand the citizen's civic problem.
2. Ask for missing information when necessary.
3. Identify the area/location.
4. Identify the specific issue.
5. Classify the issue into ONE category.
6. Determine severity.
7. Ask the citizen to confirm the information before submission.

Available categories:

- Roads & Urban Mobility
- Water Supply
- Sewerage & Drainage
- Solid Waste Management
- Street Lighting & Public Amenities
- Parks, Green Spaces & Water Bodies
- Public Health, Sanitation & Animal Services

Official AMRUT 2.0 categories are ONLY:

- Water Supply
- Sewerage & Septage Management
- Water Body Rejuvenation
- Parks & Green Space Development

The citizen may speak in:

- English
- Hindi
- Hinglish

Use simple language.

IMPORTANT RULES:

- Do NOT immediately submit the complaint.
- First collect enough information.
- If location is missing, ask for location.
- If the problem is unclear, ask a short clarification question.
- Do not invent information.
- Once enough information is available, show a confirmation summary.
- The citizen must explicitly confirm before submission.

Example confirmation:

"Here is what I understood:

Area: Rau
Issue: Irregular garbage collection
Category: Solid Waste Management
Severity: High

Is this correct?"

IMPORTANT:

Set "complete" to true ONLY when:
1. Problem is known.
2. Location is known.
3. Category is known.
4. Severity is known.
5. You have asked the citizen to confirm.

If any of these are missing:
"complete": false

Conversation so far:

${conversationText}

Return ONLY valid JSON in exactly this format:

{
  "reply": "message to show the citizen",
  "complete": false,
  "problem": "",
  "location": "",
  "issue": "",
  "category": "",
  "amrutCategory": "Not Applicable",
  "severity": ""
}

Do not add markdown.
Do not add explanations outside the JSON.
          `,

          config: {
            responseMimeType: "application/json",
          },
        });

      const data = JSON.parse(response.text);

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply,
        },
      ]);

      setConversationData({
        problem:
          data.problem ||
          conversationData.problem,

        location:
          data.location ||
          conversationData.location,

        issue:
          data.issue ||
          conversationData.issue,

        category:
          data.category ||
          conversationData.category,

        amrutCategory:
          data.amrutCategory ||
          conversationData.amrutCategory,

        severity:
          data.severity ||
          conversationData.severity,

        complete:
          data.complete === true,
      });

    } catch (error) {
      console.error(
        "Chatbot error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            "Sorry, I could not understand that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // HANDLE ENTER
  // =====================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };


  // =====================================================
  // SUBMIT COMPLAINT
  // =====================================================

  const submitComplaint = async () => {

    if (
      !conversationData.complete ||
      !conversationData.problem ||
      !conversationData.location ||
      !conversationData.category
    ) {
      alert(
        "Please confirm the complaint details before submitting."
      );

      return;
    }

    try {
      setLoading(true);

      const phone =
        localStorage.getItem(
          "citizenPhone"
        ) || "";

      await addDoc(
        collection(db, "feedback"),
        {
          problem:
            conversationData.problem,

          location:
            conversationData.location,

          issue:
            conversationData.issue ||
            "Civic Issue",

          category:
            conversationData.category,

          amrutCategory:
            conversationData.amrutCategory ||
            "Not Applicable",

          severity:
            conversationData.severity ||
            "Medium",

          citizenPhone: phone,

          status: "Pending",

          archived: false,

          dashboardVisible: true,

          createdAt:
            serverTimestamp(),
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            "Your report has been successfully submitted to JanNiti.",
        },
      ]);

      await showCommunityInsight(
        conversationData.location,
        conversationData.category
      );

      setConversationData({
        problem: "",
        location: "",
        issue: "",
        category: "",
        amrutCategory: "",
        severity: "",
        complete: false,
      });

    } catch (error) {
      console.error(
        "Complaint submission error:",
        error
      );

      alert(
        "Could not submit your report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // COMMUNITY INSIGHT
  // =====================================================

  const showCommunityInsight = async (
    location,
    category
  ) => {
    try {

      const snapshot =
        await getDocs(
          collection(db, "feedback")
        );

      const similarReports =
        snapshot.docs.filter(
          (docItem) => {

            const item =
              docItem.data();

            return (
              item.location ===
                location &&
              item.category ===
                category
            );
          }
        ).length;

      const message =
        similarReports > 1
          ? `Community Insight: JanNiti has received ${similarReports} similar reports from ${location} regarding ${category}. Your report adds to this community demand.`
          : `Community Insight: Your report is currently one of the first reports received from ${location} regarding ${category}.`;

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: message,
        },
      ]);

    } catch (error) {

      console.error(
        "Community insight error:",
        error
      );

    }
  };


  // =====================================================
  // CLOSED CHATBOT / FLOATING ROBOT
  // =====================================================

  if (!isOpen) {

    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open JanNiti Citizen Assistant"
        title="JanNiti Citizen Assistant"
        style={{
          position: "fixed",
          right: "25px",
          bottom: "25px",

          width: "72px",
          height: "72px",

          borderRadius: "50%",
          border: "none",

          background: "#1f4f82",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          cursor: "pointer",

          boxShadow:
            "0 6px 20px rgba(0,0,0,0.25)",

          zIndex: 9999,

          transition:
            "transform 0.2s ease, box-shadow 0.2s ease",
        }}

        onMouseEnter={(e) => {
          e.currentTarget.style.transform =
            "translateY(-3px) scale(1.05)";

          e.currentTarget.style.boxShadow =
            "0 10px 26px rgba(0,0,0,0.30)";
        }}

        onMouseLeave={(e) => {
          e.currentTarget.style.transform =
            "translateY(0) scale(1)";

          e.currentTarget.style.boxShadow =
            "0 6px 20px rgba(0,0,0,0.25)";
        }}
      >
        <RobotIcon size={52} />
      </button>
    );
  }


  // =====================================================
  // OPEN CHATBOT UI
  // =====================================================

  return (
    <div
      style={{
        position: "fixed",

        right: "25px",
        bottom: "25px",

        width: "360px",
        maxWidth:
          "calc(100vw - 40px)",

        height: "520px",

        background: "#fff",

        border: "1px solid #ddd",

        borderRadius: "14px",

        boxShadow:
          "0 8px 30px rgba(0,0,0,0.18)",

        display: "flex",
        flexDirection: "column",

        overflow: "hidden",

        zIndex: 9999,
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          background: "#1f4f82",

          color: "#fff",

          padding: "12px 15px",

          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >

          <div
            style={{
              width: "42px",
              height: "42px",

              borderRadius: "50%",

              background: "#ffffff",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              flexShrink: 0,
            }}
          >
            <RobotIcon size={34} />
          </div>

          <div>

            <strong
              style={{
                fontSize: "16px",
                display: "block",
              }}
            >
              JAN NITI
            </strong>

            <div
              style={{
                fontSize: "12px",
                marginTop: "2px",
                opacity: 0.9,
              }}
            >
              Citizen Assistant
            </div>

          </div>

        </div>


        {/* CLOSE BUTTON */}

        <button
          type="button"
          onClick={() =>
            setIsOpen(false)
          }
          aria-label="Close chatbot"
          style={{
            border: "none",

            background:
              "transparent",

            color: "#fff",

            fontSize: "22px",

            cursor: "pointer",

            lineHeight: "1",
          }}
        >
          ×
        </button>

      </div>


      {/* =================================================
          MESSAGES
      ================================================= */}

      <div
        style={{
          flex: 1,

          overflowY: "auto",

          padding: "15px",

          background: "#f7f8fa",
        }}
      >

        {messages.map(
          (message, index) => (

            <div
              key={index}
              style={{
                display: "flex",

                justifyContent:
                  message.role === "user"
                    ? "flex-end"
                    : "flex-start",

                marginBottom: "12px",
              }}
            >

              <div
                style={{
                  maxWidth: "82%",

                  padding:
                    "10px 13px",

                  borderRadius: "12px",

                  background:
                    message.role === "user"
                      ? "#1f4f82"
                      : "#fff",

                  color:
                    message.role === "user"
                      ? "#fff"
                      : "#222",

                  border:
                    message.role === "user"
                      ? "none"
                      : "1px solid #ddd",

                  fontSize: "14px",

                  lineHeight: "1.5",

                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {message.text}
              </div>

            </div>
          )
        )}


        {loading && (

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",

              fontSize: "13px",

              color: "#777",

              padding:
                "4px 2px",
            }}
          >

            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#1f4f82",
                display: "inline-block",
              }}
            />

            JanNiti is thinking...

          </div>

        )}

      </div>


      {/* =================================================
          CONFIRMATION / SUBMIT
      ================================================= */}

      {conversationData.complete &&
        conversationData.problem &&
        conversationData.location &&
        conversationData.category &&
        !loading && (

        <div
          style={{
            padding: "10px 15px",

            borderTop:
              "1px solid #ddd",

            background: "#fff",
          }}
        >

          <button
            type="button"
            onClick={submitComplaint}

            style={{
              width: "100%",

              padding: "10px",

              border: "none",

              borderRadius: "7px",

              background:
                "#2e7d32",

              color: "#fff",

              fontWeight: "600",

              cursor: "pointer",
            }}
          >
            Submit This Report
          </button>

        </div>

      )}


      {/* =================================================
          INPUT
      ================================================= */}

      <div
        style={{
          padding: "12px",

          borderTop:
            "1px solid #ddd",

          background: "#fff",

          display: "flex",

          gap: "8px",
        }}
      >

        <textarea
          value={input}

          onChange={(e) =>
            setInput(e.target.value)
          }

          onKeyDown={
            handleKeyDown
          }

          placeholder=
            "Tell me about a problem..."

          rows="2"

          disabled={loading}

          style={{
            flex: 1,

            resize: "none",

            border:
              "1px solid #ccc",

            borderRadius: "8px",

            padding: "9px",

            fontFamily:
              "inherit",

            fontSize: "14px",

            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={sendMessage}

          disabled={
            loading ||
            !input.trim()
          }

          style={{
            alignSelf:
              "flex-end",

            padding:
              "9px 12px",

            border: "none",

            borderRadius: "8px",

            background:
              "#1f4f82",

            color: "#fff",

            cursor:
              loading ||
              !input.trim()
                ? "not-allowed"
                : "pointer",

            opacity:
              loading ||
              !input.trim()
                ? 0.65
                : 1,
          }}
        >
          Send
        </button>

      </div>

    </div>
  );
}

export default Chatbot;