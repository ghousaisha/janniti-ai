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
    });

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const conversation = [
        ...messages,
        {
          role: "user",
          text,
        },
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

IMPORTANT:
Do NOT immediately submit the complaint.

First collect enough information.

If the location is missing, ask for the location.

If the problem is unclear, ask a short clarification question.

Once you have enough information, respond with a confirmation summary like:

"Here is what I understood:

Area: Rau
Issue: Irregular garbage collection
Category: Solid Waste Management
Severity: High

Is this correct?"

Conversation so far:

${conversationText}

Return ONLY valid JSON in this exact format:

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

If information is incomplete:
- complete must be false.

If enough information has been collected AND you have asked for confirmation:
- complete must be true.

Do not invent information that the citizen did not provide.
          `,

          config: {
            responseMimeType: "application/json",
          },
        });

      const data = JSON.parse(
        response.text
      );

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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };


  // =====================================================
  // SUBMIT COMPLAINT
  // =====================================================

  const submitComplaint = async () => {
    if (
      !conversationData.problem ||
      !conversationData.location ||
      !conversationData.category
    ) {
      alert(
        "Please provide enough information before submitting."
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

      // Check similar reports
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
  // CLOSE / OPEN
  // =====================================================

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          right: "25px",
          bottom: "25px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          border: "none",
          background: "#1f4f82",
          color: "#fff",
          fontWeight: "700",
          cursor: "pointer",
          boxShadow:
            "0 4px 15px rgba(0,0,0,0.2)",
          zIndex: 9999,
        }}
      >
        Jan
      </button>
    );
  }


  // =====================================================
  // CHATBOT UI
  // =====================================================

  return (
    <div
      style={{
        position: "fixed",
        right: "25px",
        bottom: "25px",
        width: "360px",
        maxWidth: "calc(100vw - 40px)",
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
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>
            JAN NITI
          </strong>

          <div
            style={{
              fontSize: "12px",
              marginTop: "3px",
              opacity: 0.9,
            }}
          >
            Citizen Assistant
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsOpen(false)
          }
          style={{
            border: "none",
            background: "transparent",
            color: "#fff",
            fontSize: "20px",
            cursor: "pointer",
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
                  padding: "10px 13px",
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
              fontSize: "13px",
              color: "#777",
            }}
          >
            JanNiti is thinking...
          </div>
        )}

      </div>


      {/* =================================================
          CONFIRMATION
      ================================================= */}

      {conversationData.problem &&
        conversationData.location &&
        conversationData.category &&
        !loading && (

        <div
          style={{
            padding: "10px 15px",
            borderTop: "1px solid #ddd",
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
              background: "#2e7d32",
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
          borderTop: "1px solid #ddd",
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
          onKeyDown={handleKeyDown}
          placeholder="Tell me about a problem..."
          rows="2"
          disabled={loading}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "9px",
            fontFamily: "inherit",
            fontSize: "14px",
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
            alignSelf: "flex-end",
            padding: "9px 12px",
            border: "none",
            borderRadius: "8px",
            background: "#1f4f82",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send
        </button>

      </div>

    </div>
  );
}

export default Chatbot;