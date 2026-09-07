# JanNiti AI 🏛️

Turning citizen voices into data-driven public development
decisions.

JanNiti AI is an AI-powered civic grievance and development intelligence
platform that connects citizens, civic issues, and policymakers in
one system.

# 🌐 The Idea

Citizen Feedback → AI Analysis → Development Priorities → Government
Action → Citizen Updates

JanNiti is designed to transform individual complaints into structured
civic intelligence that can help policymakers understand what is
happening, where it is happening, and which issues may need attention
first.

# Features

👤 Citizen Portal

Civic complaint submission

Phone/OTP verification

Text-based complaints

Voice-based complaint input

Area selection

Real-time complaint notifications

🤖 AI Complaint Analysis

Powered by Google Gemini, JanNiti analyzes complaints and
extracts: - Civic issue category - AMRUT 2.0 category - Severity -
Structured complaint information

📊 Policymaker Dashboard

Total feedback

Pending / processing / resolved complaints

Resolution rate

Area-wise demand

Issue-wise analysis

Development priorities

Citizen feedback

Resolved complaint history

Civic recommendations

🎯 Development Priority Analysis

JanNiti combines citizen demand with development indicators such as: -
Citizen demand - Infrastructure gaps - Population needs - Investment
gaps

🔔 Citizen Notifications

Citizens receive updates when their complaint moves to: -
Processing - Resolved

🧠 How It Works

Citizen
  │
  ├── Text
  └── Voice
       │
       ▼
   Gemini AI
       │
       ├── Category
       ├── Severity
       └── AMRUT Category
       │
       ▼
   Firestore
       │
       ▼
Policymaker Dashboard
       │
       ├── Priority
       ├── Processing
       └── Resolution
       │
       ▼
Citizen Notification

# Tech Stack

Layer             Technology

Frontend          React + Vite
Language          JavaScript / JSX
AI                Google Gemini API
Authentication    Firebase Authentication
Database          Firebase Firestore
Hosting           Firebase Hosting
CI/CD             GitHub Actions
Version Control   Git + GitHub


# JanNiti uses GitHub Actions and Firebase Hosting for automated deployment.

# Future Roadmap

 1. Image-Based Complaints

Citizens will be able to attach photographs along with their complaints.

Example:

Complaint:
"Large pothole near the public road."

Photo:
[Uploaded evidence]

Planned capabilities: - Camera/photo upload - Firebase Storage - Image
attached to complaint records - AI-powered image analysis - Visual
evidence for policymakers

Potential detection: - Potholes - Garbage accumulation - Waterlogging -
Broken streetlights - Drainage problems - Damaged public infrastructure

This will expand the platform from Text + Voice to Text + Voice +
Image.

 2. Automatic Area Detection

Instead of manually selecting an area, citizens could grant location
permission and allow JanNiti to detect the approximate complaint
location.

Location Permission
        ↓
GPS Coordinates
        ↓
Geolocation
        ↓
Area / Ward / Zone
        ↓
Complaint

This could enable: - Automatic area detection - Ward detection - Zone
detection - Municipal-boundary mapping - More accurate geographic
analytics

Location access should always require explicit user permission and
collect only necessary information.

 3. Duplicate Complaint Detection

AI could identify multiple reports describing the same civic problem
using: - Location - Text similarity - Images - Issue category -
Submission time

Example:

Citizen A → Pothole at Location X
Citizen B → Large pothole at Location X
Citizen C → Road damage at Location X
                         ↓
                One Civic Issue
                + Multiple Reports

This can provide a better representation of citizen demand.

 5. Automatic Department Routing

Future versions could route complaints automatically:

Pothole      → Roads / Public Works
Garbage      → Sanitation
Streetlight  → Electrical
Water        → Water Department

 6. Predictive Civic Analytics

With historical data, JanNiti could identify: - Recurring problems -
Frequently affected areas - Increasing complaint trends - Seasonal
patterns - Preventive-maintenance needs

The long-term objective is to move from reactive complaint handling
toward preventive civic planning.



🌐 8. Multilingual Access

Future versions can support: - Multiple Indian languages - Multilingual
AI classification - Regional-language voice input - Translation and
transcription

🎯 Long-Term Vision

JanNiti aims to evolve from a complaint portal into a civic
intelligence platform.

             CITIZEN
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
    TEXT       VOICE       IMAGE
     │           │           │
     └───────────┼───────────┘
                 ▼
          LOCATION DATA
                 │
                 ▼
            JAN NITI AI
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
 Classification Severity  Verification
      │          │          │
      └──────────┼──────────┘
                 ▼
          CIVIC DATA LAYER
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      Areas    Issues    Demand
        │        │        │
        └────────┼────────┘
                 ▼
       DEVELOPMENT PRIORITIES
                 │
                 ▼
       POLICYMAKER DASHBOARD
                 │
                 ▼
            CIVIC ACTION
                 │
                 ▼
             RESOLUTION
                 │
                 ▼
          CITIZEN UPDATE

The vision is simple: make every citizen complaint useful for better
public decision-making.

# Project Status

Implemented

Citizen complaint submission

Phone/OTP verification

Voice complaint input

Gemini AI classification

Civic issue categorization

AMRUT 2.0 categorization

Severity analysis

Firebase Authentication

Firebase Firestore

Policymaker dashboard

Development priority analysis

Area-wise demand analysis

Issue analytics

Complaint status management

Citizen notifications

Resolved complaint history

Firebase Hosting

GitHub Actions CI/CD

# Planned

Image-based complaint submission

Camera-based evidence

Firebase Storage integration

AI image analysis

Automatic location detection

Ward / zone detection

Interactive civic issue map

Duplicate complaint detection

Automatic department routing

Advanced priority scoring

Predictive civic analytics

Multilingual AI and voice support

👩‍💻 Author

Aisha Ghous

JanNiti AI --- AI-powered civic grievance and development
intelligence platform.
