import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import publicData from "./publicData";
import "./App.css";

const projectRecommendations = {
  "Roads & Urban Mobility":
    "Road repair and urban mobility improvement",

  "Water Supply":
    "Water supply improvement",

  "Sewerage & Drainage":
    "Drainage and sewerage improvement",

  "Solid Waste Management":
    "Waste collection and management improvement",

  "Street Lighting & Public Amenities":
    "Street lighting and public amenity improvement",

  "Parks, Green Spaces & Water Bodies":
    "Park, green-space and water-body improvement",

  "Public Health, Sanitation & Animal Services":
    "Public health, sanitation and animal-service improvement",
};


// =========================================================
// GET PRIORITY STATUS
// =========================================================

function getPriorityStatus(complaints) {
  if (!complaints.length) {
    return "Pending";
  }

  const statuses = complaints.map(
    (item) => item.status || "Pending"
  );

  if (
    statuses.some(
      (status) => status === "Processing"
    )
  ) {
    return "Processing";
  }

  return "Pending";
}


// =========================================================
// DASHBOARD
// =========================================================

function Dashboard() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingPriority, setUpdatingPriority] = useState(null);
  const [expandedPriority, setExpandedPriority] = useState(null);


  // ======================================================
  // FETCH FEEDBACK
  // ======================================================

  const fetchFeedback = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "feedback")
      );

      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setFeedback(data);
    } catch (error) {
      console.error(
        "Error loading dashboard:",
        error
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchFeedback();
  }, []);


  // ======================================================
  // UPDATE ENTIRE DEVELOPMENT PRIORITY
  // ======================================================

  const updatePriorityStatus = async (
    priority,
    newStatus
  ) => {
    const priorityKey =
      `${priority.area}|||${priority.category}`;

    try {
      setUpdatingPriority(priorityKey);

      const complaints = priority.complaints || [];

      if (!complaints.length) {
        return;
      }


      // ====================================================
      // UPDATE EVERY COMPLAINT IN THIS PRIORITY
      // ====================================================

      for (const complaint of complaints) {
        const complaintRef = doc(
          db,
          "feedback",
          complaint.id
        );


        const updateData = {
          status: newStatus,
          updatedAt: serverTimestamp(),
        };


        // ==================================================
        // PROCESSING
        // ==================================================

        if (newStatus === "Processing") {
          updateData.startedAt =
            serverTimestamp();

          updateData.expectedResolution =
            "3 days";

          updateData.archived = false;
          updateData.dashboardVisible = true;
        }


        // ==================================================
        // RESOLVED
        // Automatically archive the complaint
        // ==================================================

        if (newStatus === "Resolved") {
          updateData.resolvedAt =
            serverTimestamp();

          updateData.archived = true;

          updateData.dashboardVisible = false;

          updateData.archivedAt =
            serverTimestamp();
        }


        await updateDoc(
          complaintRef,
          updateData
        );


        // ==================================================
        // CREATE CITIZEN NOTIFICATION
        // ==================================================

        if (complaint.citizenPhone) {
          let message = "";


          // ------------------------------------------------
          // PROCESSING MESSAGE
          // ------------------------------------------------

          if (newStatus === "Processing") {
            message =
              `JanNiti Update: Your complaint ` +
              `regarding ${priority.category} ` +
              `in ${priority.area} is now being processed. ` +
              `Expected resolution: 3 days.`;
          }


          // ------------------------------------------------
          // RESOLVED MESSAGE
          // ------------------------------------------------

          if (newStatus === "Resolved") {
            message =
              `JanNiti Update: Your complaint ` +
              `regarding ${priority.category} ` +
              `in ${priority.area} ` +
              `has been resolved.`;
          }


          await addDoc(
            collection(db, "notifications"),
            {
              citizenPhone:
                complaint.citizenPhone,

              complaintId:
                complaint.complaintId ||
                complaint.id,

              area:
                priority.area,

              category:
                priority.category,

              status:
                newStatus,

              message,

              read: false,

              createdAt:
                serverTimestamp(),
            }
          );
        }
      }


      // ====================================================
      // REFRESH DASHBOARD
      // ====================================================

      await fetchFeedback();


      // ====================================================
      // CLOSE EXPANDED PRIORITY AFTER RESOLUTION
      // ====================================================

      if (newStatus === "Resolved") {
        setExpandedPriority(null);
      }

    } catch (error) {
      console.error(
        "Priority update error:",
        error
      );

      alert(
        "Could not update this development priority."
      );
    } finally {
      setUpdatingPriority(null);
    }
  };


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-box">
          <h2>JAN NITI</h2>

          <p>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }


  // ======================================================
  // ISSUE COUNTS
  // ======================================================

  const issueCounts = {};

  feedback.forEach((item) => {
    const issue =
      item.issue || "Other";

    issueCounts[issue] =
      (issueCounts[issue] || 0) + 1;
  });


  // ======================================================
  // AREA COUNTS
  // ======================================================

  const areaCounts = {};

  feedback.forEach((item) => {
    const area =
      item.location || "Unknown";

    areaCounts[area] =
      (areaCounts[area] || 0) + 1;
  });


  // ======================================================
  // CATEGORY COUNTS
  // ======================================================

  const categoryCounts = {};

  feedback.forEach((item) => {
    const category =
      item.category || "Other Civic Service";

    categoryCounts[category] =
      (categoryCounts[category] || 0) + 1;
  });


  // ======================================================
  // ONLY ACTIVE FEEDBACK
  // ======================================================

  const activeFeedback =
    feedback.filter(
      (item) =>
        item.status !== "Resolved" &&
        item.archived !== true &&
        item.dashboardVisible !== false
    );


  // ======================================================
  // GROUP ACTIVE FEEDBACK
  // ======================================================

  const categoryGroups = {};

  activeFeedback.forEach((item) => {
    const area =
      item.location || "Unknown";

    const category =
      item.category || "Other Civic Service";

    const key =
      `${area}|||${category}`;

    if (!categoryGroups[key]) {
      categoryGroups[key] = {
        area,
        category,
        complaints: [],
      };
    }

    categoryGroups[key].complaints.push(item);
  });


  // ======================================================
  // PRIORITY CALCULATION
  // ======================================================

  const priorities =
    Object.values(categoryGroups).map(
      (group) => {
        const {
          area,
          category,
          complaints,
        } = group;


        // ------------------------------------------------
        // CITIZEN DEMAND
        // ------------------------------------------------

        const demand =
          complaints.length;

        const demandScore =
          Math.min(
            demand * 20,
            100
          );


        // ------------------------------------------------
        // PUBLIC DATA
        // ------------------------------------------------

        const areaData =
          publicData[area]?.[category];

        let infrastructureScore = 50;
        let populationNeed = 50;
        let investmentGap = 50;

        if (areaData) {
          infrastructureScore =
            areaData.infrastructureScore;

          populationNeed =
            areaData.populationNeed;

          investmentGap =
            areaData.investmentGap;
        }


        // ------------------------------------------------
        // INFRASTRUCTURE GAP
        // ------------------------------------------------

        const infrastructureGap =
          100 - infrastructureScore;


        // ------------------------------------------------
        // FINAL PRIORITY SCORE
        // 40% demand
        // 30% infrastructure gap
        // 20% population need
        // 10% investment gap
        // ------------------------------------------------

        const priorityScore =
          demandScore * 0.4 +
          infrastructureGap * 0.3 +
          populationNeed * 0.2 +
          investmentGap * 0.1;


        // ------------------------------------------------
        // MAIN ISSUE
        // ------------------------------------------------

        const issueFrequency = {};

        complaints.forEach((item) => {
          const issue =
            item.issue || "Other";

          issueFrequency[issue] =
            (
              issueFrequency[issue] || 0
            ) + 1;
        });

        const mainIssue =
          Object.entries(
            issueFrequency
          ).sort(
            (a, b) =>
              b[1] - a[1]
          )[0]?.[0] ||
          "Civic issue";


        // ------------------------------------------------
        // AMRUT CATEGORY
        // ------------------------------------------------

        const amrutCategory =
          complaints.find(
            (item) =>
              item.amrutCategory
          )?.amrutCategory ||
          "Not Applicable";


        // ------------------------------------------------
        // RETURN PRIORITY
        // ------------------------------------------------

        return {
          area,
          category,
          demand,
          demandScore,
          infrastructureGap,
          populationNeed,
          investmentGap,

          priorityScore:
            Math.round(
              priorityScore
            ),

          mainIssue,
          amrutCategory,

          recommendation:
            projectRecommendations[
              category
            ] ||
            "Further assessment required",

          complaints,

          status:
            getPriorityStatus(
              complaints
            ),
        };
      }
    );


  // ======================================================
  // SORT HIGHEST PRIORITY FIRST
  // ======================================================

  priorities.sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );


  // ======================================================
  // TOP PRIORITY
  // ======================================================

  const topPriority =
    priorities[0];


  // ======================================================
  // MAX ISSUE COUNT
  // ======================================================

  const maxIssueCount =
    Math.max(
      ...Object.values(issueCounts),
      1
    );


  // ======================================================
  // MAX AREA COUNT
  // ======================================================

  const maxAreaCount =
    Math.max(
      ...Object.values(areaCounts),
      1
    );


  // ======================================================
  // MAX CATEGORY COUNT
  // ======================================================

  const maxCategoryCount =
    Math.max(
      ...Object.values(categoryCounts),
      1
    );


  // ======================================================
  // STATUS COUNTS
  // ======================================================

  const processingCount =
    feedback.filter(
      (item) =>
        item.status === "Processing"
    ).length;

  const resolvedCount =
    feedback.filter(
      (item) =>
        item.status === "Resolved"
    ).length;

  const pendingCount =
    feedback.filter(
      (item) =>
        !item.status ||
        item.status === "Pending"
    ).length;


  // ======================================================
  // RESOLUTION RATE
  // ======================================================

  const resolutionRate =
    feedback.length > 0
      ? Math.round(
          (resolvedCount /
            feedback.length) *
            100
        )
      : 0;


  // ======================================================
  // RESOLVED HISTORY
  // ======================================================

  const resolvedHistory =
    feedback.filter(
      (item) =>
        item.status === "Resolved"
    );


  // ======================================================
  // TOP PRIORITY GRAPH DATA
  // ======================================================

  const priorityGraphData =
    priorities.slice(0, 6);


  // ======================================================
  // DASHBOARD
  // ======================================================

  return (
    <div className="dashboard-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="dashboard-header">
        <div>
          <div className="brand">
            JAN NITI
          </div>

          <p>
            Policymaker Dashboard
          </p>
        </div>

        <div className="header-status">
          Development Prioritization
        </div>
      </header>


      <main className="dashboard-content">


        {/* =================================================
            NEW EXECUTIVE DASHBOARD
        ================================================= */}

        <section
          id="executive-dashboard"
          style={{
            marginBottom: "42px",
          }}
        >

          <div className="section-heading">
            <div>
              <h2>
                Executive Dashboard
              </h2>

              <p>
                Real-time summary of citizen demand,
                development priorities and complaint status
              </p>
            </div>

            <span
              className="priority-count"
            >
              Live Data
            </span>
          </div>


          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("citizen-feedback")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                textAlign: "left",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Total Feedback
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#123b66",
                }}
              >
                {feedback.length}
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Citizen submissions
              </small>
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("development-priorities")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                textAlign: "left",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Active Priorities
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#1769c2",
                }}
              >
                {priorities.length}
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Areas requiring attention
              </small>
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("status-summary")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                textAlign: "left",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Pending
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#b77900",
                }}
              >
                {pendingCount}
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Awaiting action
              </small>
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("resolved-history")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                textAlign: "left",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Resolved
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#16855b",
                }}
              >
                {resolvedCount}
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Completed complaints
              </small>
            </button>


            <div
              style={{
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Areas Covered
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#123b66",
                }}
              >
                {
                  Object.keys(
                    areaCounts
                  ).length
                }
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Locations represented
              </small>
            </div>


            <div
              style={{
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6480a0",
                  marginBottom: "8px",
                }}
              >
                Resolution Rate
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "30px",
                  color: "#16855b",
                }}
              >
                {resolutionRate}%
              </strong>

              <small
                style={{
                  color: "#6f86a0",
                }}
              >
                Of all feedback
              </small>
            </div>

          </div>


          {/* =================================================
              QUICK ACTION BUTTONS
          ================================================= */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "22px",
            }}
          >

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("development-priorities")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #1769c2",
                background: "#1769c2",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View Development Priorities
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("analysis")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #d5dfeb",
                background: "#fff",
                color: "#123b66",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View Analytics
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("citizen-feedback")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #d5dfeb",
                background: "#fff",
                color: "#123b66",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View Citizen Feedback
            </button>


            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("resolved-history")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #d5dfeb",
                background: "#fff",
                color: "#123b66",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View Resolved History
            </button>

          </div>


          {/* =================================================
              GRAPHS GRID
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "18px",
            }}
          >


            {/* ===============================================
                STATUS GRAPH
            =============================================== */}

            <div
              style={{
                background: "#fff",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "22px",
              }}
            >

              <h3
                style={{
                  margin: "0 0 5px",
                  color: "#123b66",
                }}
              >
                Complaint Status
              </h3>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#6f86a0",
                  fontSize: "13px",
                }}
              >
                Current status of all citizen submissions
              </p>


              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "25px",
                  flexWrap: "wrap",
                }}
              >

                <div
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    background:
                      `conic-gradient(
                        #16855b 0 ${resolvedCount > 0 ? (resolvedCount / Math.max(feedback.length, 1)) * 100 : 0}%,
                        #e3a72f ${resolvedCount > 0 ? (resolvedCount / Math.max(feedback.length, 1)) * 100 : 0}% ${((resolvedCount + pendingCount) / Math.max(feedback.length, 1)) * 100}%,
                        #1769c2 ${((resolvedCount + pendingCount) / Math.max(feedback.length, 1)) * 100}% 100%
                      )`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >

                  <div
                    style={{
                      width: "92px",
                      height: "92px",
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >

                    <strong
                      style={{
                        fontSize: "25px",
                        color: "#123b66",
                      }}
                    >
                      {feedback.length}
                    </strong>

                    <span
                      style={{
                        fontSize: "11px",
                        color: "#6f86a0",
                      }}
                    >
                      Total
                    </span>

                  </div>

                </div>


                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >

                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#e3a72f",
                        marginRight: "8px",
                      }}
                    />

                    <strong>
                      Pending
                    </strong>

                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#6f86a0",
                      }}
                    >
                      {pendingCount}
                    </span>
                  </div>


                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#1769c2",
                        marginRight: "8px",
                      }}
                    />

                    <strong>
                      Processing
                    </strong>

                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#6f86a0",
                      }}
                    >
                      {processingCount}
                    </span>
                  </div>


                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "#16855b",
                        marginRight: "8px",
                      }}
                    />

                    <strong>
                      Resolved
                    </strong>

                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#6f86a0",
                      }}
                    >
                      {resolvedCount}
                    </span>
                  </div>

                </div>

              </div>

            </div>


            {/* ===============================================
                AREA DEMAND GRAPH
            =============================================== */}

            <div
              style={{
                background: "#fff",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "22px",
              }}
            >

              <h3
                style={{
                  margin: "0 0 5px",
                  color: "#123b66",
                }}
              >
                Citizen Demand by Area
              </h3>

              <p
                style={{
                  margin: "0 0 18px",
                  color: "#6f86a0",
                  fontSize: "13px",
                }}
              >
                Areas receiving the highest number of reports
              </p>


              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "13px",
                }}
              >

                {Object.entries(areaCounts)
                  .sort(
                    (a, b) =>
                      b[1] - a[1]
                  )
                  .map(
                    ([area, count]) => (

                      <div
                        key={area}
                      >

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "5px",
                            fontSize: "13px",
                          }}
                        >

                          <span>
                            {area}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>


                        <div
                          style={{
                            height: "8px",
                            borderRadius: "10px",
                            background: "#e7edf4",
                            overflow: "hidden",
                          }}
                        >

                          <div
                            style={{
                              width:
                                `${(
                                  count /
                                  maxAreaCount
                                ) * 100}%`,
                              height: "100%",
                              borderRadius: "10px",
                              background: "#1769c2",
                              transition:
                                "width 0.4s ease",
                            }}
                          />

                        </div>

                      </div>

                    )
                  )}

              </div>

            </div>


            {/* ===============================================
                CATEGORY GRAPH
            =============================================== */}

            <div
              style={{
                background: "#fff",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "22px",
              }}
            >

              <h3
                style={{
                  margin: "0 0 5px",
                  color: "#123b66",
                }}
              >
                Issue Categories
              </h3>

              <p
                style={{
                  margin: "0 0 18px",
                  color: "#6f86a0",
                  fontSize: "13px",
                }}
              >
                Distribution of civic service complaints
              </p>


              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "13px",
                }}
              >

                {Object.entries(categoryCounts)
                  .sort(
                    (a, b) =>
                      b[1] - a[1]
                  )
                  .map(
                    ([category, count]) => (

                      <div
                        key={category}
                      >

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "5px",
                            fontSize: "13px",
                          }}
                        >

                          <span>
                            {category}
                          </span>

                          <strong>
                            {count}
                          </strong>

                        </div>


                        <div
                          style={{
                            height: "8px",
                            borderRadius: "10px",
                            background: "#e7edf4",
                            overflow: "hidden",
                          }}
                        >

                          <div
                            style={{
                              width:
                                `${(
                                  count /
                                  maxCategoryCount
                                ) * 100}%`,
                              height: "100%",
                              borderRadius: "10px",
                              background: "#4c78b8",
                              transition:
                                "width 0.4s ease",
                            }}
                          />

                        </div>

                      </div>

                    )
                  )}

              </div>

            </div>


            {/* ===============================================
                PRIORITY GRAPH
            =============================================== */}

            <div
              style={{
                background: "#fff",
                border: "1px solid #d8e0ea",
                borderRadius: "12px",
                padding: "22px",
              }}
            >

              <h3
                style={{
                  margin: "0 0 5px",
                  color: "#123b66",
                }}
              >
                Top Development Priorities
              </h3>

              <p
                style={{
                  margin: "0 0 18px",
                  color: "#6f86a0",
                  fontSize: "13px",
                }}
              >
                Highest-ranked active development needs
              </p>


              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >

                {priorityGraphData.map(
                  (item, index) => (

                    <div
                      key={
                        `${item.area}-${item.category}-${index}`
                      }
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          marginBottom: "5px",
                          fontSize: "13px",
                        }}
                      >

                        <span>
                          #{index + 1} {item.area}
                        </span>

                        <strong>
                          {item.priorityScore}
                        </strong>

                      </div>


                      <div
                        style={{
                          height: "9px",
                          borderRadius: "10px",
                          background: "#e7edf4",
                          overflow: "hidden",
                        }}
                      >

                        <div
                          style={{
                            width:
                              `${item.priorityScore}%`,
                            height: "100%",
                            borderRadius: "10px",
                            background: "#1769c2",
                          }}
                        />

                      </div>


                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "#71869f",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.category}
                      </small>

                    </div>

                  )
                )}

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section>
          <div className="section-heading">
            <div>
              <h2>
                Overview
              </h2>

              <p>
                Citizen feedback and development demand
              </p>
            </div>
          </div>


          <div className="overview-grid">

            <div className="stat-card">
              <span>
                Total Feedback
              </span>

              <strong>
                {feedback.length}
              </strong>

              <small>
                Citizen submissions
              </small>
            </div>


            <div className="stat-card">
              <span>
                Issues Reported
              </span>

              <strong>
                {
                  Object.keys(
                    issueCounts
                  ).length
                }
              </strong>

              <small>
                Unique issue types
              </small>
            </div>


            <div className="stat-card">
              <span>
                Areas Covered
              </span>

              <strong>
                {
                  Object.keys(
                    areaCounts
                  ).length
                }
              </strong>

              <small>
                Locations represented
              </small>
            </div>

          </div>
        </section>


        {/* =================================================
            TOP DEVELOPMENT PRIORITY
        ================================================= */}

        {topPriority && (
          <section>

            <div className="section-heading">
              <div>
                <h2>
                  Top Development Priority
                </h2>

                <p>
                  Highest-ranked area and development category
                </p>
              </div>
            </div>


            <div className="top-priority">

              <div className="priority-main">

                <div className="rank-badge">
                  #1
                </div>

                <div>
                  <h3>
                    {topPriority.area}
                  </h3>

                  <p className="category-name">
                    {topPriority.category}
                  </p>

                  <p className="issue-text">
                    Main issue:{" "}
                    {topPriority.mainIssue}
                  </p>
                </div>

              </div>


              <div className="score-box">

                <span>
                  Priority Score
                </span>

                <strong>
                  {
                    topPriority.priorityScore
                  }

                  <small>
                    /100
                  </small>
                </strong>

              </div>


              <div className="score-bar">
                <div
                  style={{
                    width:
                      `${topPriority.priorityScore}%`,
                  }}
                />
              </div>


              <div className="factor-grid">

                <div>
                  <span>
                    Citizen Demand
                  </span>

                  <strong>
                    {
                      topPriority.demand
                    } feedback
                  </strong>
                </div>


                <div>
                  <span>
                    Infrastructure Gap
                  </span>

                  <strong>
                    {
                      topPriority.infrastructureGap
                    }/100
                  </strong>
                </div>


                <div>
                  <span>
                    Population Need
                  </span>

                  <strong>
                    {
                      topPriority.populationNeed
                    }/100
                  </strong>
                </div>


                <div>
                  <span>
                    Investment Gap
                  </span>

                  <strong>
                    {
                      topPriority.investmentGap
                    }/100
                  </strong>
                </div>

              </div>


              <div className="recommendation">

                <span>
                  Recommended Project
                </span>

                <strong>
                  {
                    topPriority.recommendation
                  }
                </strong>

              </div>


              <div className="amrut-info">

                <span>
                  AMRUT 2.0 Category
                </span>

                <strong>
                  {
                    topPriority.amrutCategory
                  }
                </strong>

              </div>

            </div>

          </section>
        )}


        {/* =================================================
            DEVELOPMENT PRIORITIES
        ================================================= */}

        <section
          id="development-priorities"
        >

          <div className="section-heading">

            <div>
              <h2>
                Development Priorities
              </h2>

              <p>
                Ranked using active citizen demand,
                infrastructure gaps, population need
                and investment gaps.
              </p>
            </div>


            <span className="priority-count">
              {priorities.length} priorities
            </span>

          </div>


          <div className="priority-list">

            {priorities.length === 0 ? (

              <div className="history-empty">
                No active development priorities.
              </div>

            ) : (

              priorities.map(
                (item, index) => {

                  const priorityKey =
                    `${item.area}|||${item.category}`;

                  const isExpanded =
                    expandedPriority ===
                    priorityKey;

                  const isUpdating =
                    updatingPriority ===
                    priorityKey;


                  return (
                    <div
                      className={
                        isExpanded
                          ? "priority-row expanded"
                          : "priority-row"
                      }
                      key={priorityKey}
                    >


                      {/* RANK */}

                      <div className="priority-number">
                        #{index + 1}
                      </div>


                      {/* PRIORITY INFO */}

                      <div className="priority-info">

                        <div className="priority-title-line">

                          <h3>
                            {item.area}
                          </h3>

                          <span
                            className={
                              `priority-status ${
                                item.status.toLowerCase()
                              }`
                            }
                          >
                            {item.status}
                          </span>

                        </div>


                        <p>
                          {item.category}
                        </p>

                        <small>
                          {
                            item.demand
                          } active citizen reports
                        </small>

                      </div>


                      {/* SCORE */}

                      <div className="priority-score-small">

                        <span>
                          Score
                        </span>

                        <strong>
                          {
                            item.priorityScore
                          }
                        </strong>

                      </div>


                      {/* SCORE BAR */}

                      <div className="mini-score-bar">

                        <div
                          style={{
                            width:
                              `${item.priorityScore}%`,
                          }}
                        />

                      </div>


                      {/* =================================================
                          PRIORITY ACTIONS
                      ================================================= */}

                      <div className="priority-actions">

                        <button
                          type="button"
                          className="processing-button"
                          disabled={
                            isUpdating ||
                            item.status ===
                              "Processing"
                          }
                          onClick={() =>
                            updatePriorityStatus(
                              item,
                              "Processing"
                            )
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : item.status ===
                              "Processing"
                              ? "Processing"
                              : "Start Processing"}
                        </button>


                        <button
                          type="button"
                          className="resolved-button"
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            updatePriorityStatus(
                              item,
                              "Resolved"
                            )
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Mark Resolved"}
                        </button>


                        <button
                          type="button"
                          className="expand-button"
                          onClick={() =>
                            setExpandedPriority(
                              isExpanded
                                ? null
                                : priorityKey
                            )
                          }
                        >
                          {
                            isExpanded
                              ? "−"
                              : "⌄"
                          }
                        </button>

                      </div>


                      {/* =================================================
                          EXPANDED DETAILS
                      ================================================= */}

                      {isExpanded && (

                        <div className="priority-expanded">

                          <div className="expanded-grid">

                            <div>
                              <span>
                                Main Issue
                              </span>

                              <strong>
                                {
                                  item.mainIssue
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                Recommended Project
                              </span>

                              <strong>
                                {
                                  item.recommendation
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                AMRUT 2.0
                              </span>

                              <strong>
                                {
                                  item.amrutCategory
                                }
                              </strong>
                            </div>

                          </div>


                          <div className="citizen-reports">

                            <h4>
                              Citizen Reports
                            </h4>

                            <p>
                              {
                                item.complaints.length
                              } active reports linked to this development priority
                            </p>


                            {item.complaints.map(
                              (complaint) => (

                                <div
                                  className="report-row"
                                  key={
                                    complaint.id
                                  }
                                >

                                  <div>
                                    <span>
                                      Complaint
                                    </span>

                                    <strong>
                                      {
                                        complaint.problem
                                      }
                                    </strong>
                                  </div>


                                  <div>
                                    <span>
                                      Status
                                    </span>

                                    <strong
                                      className={
                                        `report-status ${
                                          (
                                            complaint.status ||
                                            "Pending"
                                          ).toLowerCase()
                                        }`
                                      }
                                    >
                                      {
                                        complaint.status ||
                                        "Pending"
                                      }
                                    </strong>
                                  </div>

                                </div>

                              )
                            )}

                          </div>

                        </div>

                      )}

                    </div>
                  );
                }
              )

            )}

          </div>

        </section>


        {/* =================================================
            ISSUE + AREA ANALYSIS
        ================================================= */}

        <div
          className="analysis-grid"
          id="analysis"
        >

          <section className="panel-section">

            <div className="section-heading">

              <div>
                <h2>
                  Issue Analysis
                </h2>

                <p>
                  Frequency of reported issues
                </p>
              </div>

            </div>


            <div className="analysis-card">

              {Object.entries(issueCounts)
                .sort(
                  (a, b) =>
                    b[1] - a[1]
                )
                .map(
                  ([issue, count]) => (

                    <div
                      className="bar-item"
                      key={issue}
                    >

                      <div className="bar-label">

                        <span>
                          {issue}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>


                      <div className="horizontal-bar">

                        <div
                          style={{
                            width:
                              `${
                                (
                                  count /
                                  maxIssueCount
                                ) *
                                100
                              }%`,
                          }}
                        />

                      </div>

                    </div>

                  )
                )}

            </div>

          </section>


          <section className="panel-section">

            <div className="section-heading">

              <div>
                <h2>
                  Demand by Area
                </h2>

                <p>
                  Citizen feedback distribution
                </p>
              </div>

            </div>


            <div className="analysis-card">

              {Object.entries(areaCounts)
                .sort(
                  (a, b) =>
                    b[1] - a[1]
                )
                .map(
                  ([area, count]) => (

                    <div
                      className="bar-item"
                      key={area}
                    >

                      <div className="bar-label">

                        <span>
                          {area}
                        </span>

                        <strong>
                          {count}
                        </strong>

                      </div>


                      <div className="horizontal-bar">

                        <div
                          style={{
                            width:
                              `${
                                (
                                  count /
                                  maxAreaCount
                                ) *
                                100
                              }%`,
                          }}
                        />

                      </div>

                    </div>

                  )
                )}

            </div>

          </section>

        </div>


        {/* =================================================
            CITIZEN FEEDBACK
        ================================================= */}

        <section
          id="citizen-feedback"
        >

          <div className="section-heading">

            <div>
              <h2>
                Citizen Feedback
              </h2>

              <p>
                Latest submissions received by Jan Niti
              </p>
            </div>

          </div>


          <div className="feedback-list">

            {feedback.map(
              (item) => (

                <div
                  className="feedback-item"
                  key={item.id}
                >

                  <div className="feedback-header">

                    <div>

                      <h3>
                        {
                          item.issue ||
                          "Civic Issue"
                        }
                      </h3>

                      <span>
                        {
                          item.location ||
                          "Unknown Area"
                        }
                      </span>

                    </div>


                    <div className="feedback-category">

                      {
                        item.category ||
                        "Other"
                      }

                    </div>

                  </div>


                  <p className="problem">
                    {item.problem}
                  </p>


                  <div className="feedback-details">

                    <div>

                      <span>
                        AMRUT 2.0
                      </span>

                      <strong>
                        {
                          item.amrutCategory ||
                          "Not Applicable"
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Severity
                      </span>

                      <strong>
                        {
                          item.severity ||
                          "Not classified"
                        }
                      </strong>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* =================================================
            RESOLVED HISTORY
        ================================================= */}

        <section
          className="resolved-history"
          id="resolved-history"
        >

          <div className="section-heading">

            <div>

              <h2>
                Resolved History
              </h2>

              <p>
                Previously resolved complaints retained for records
              </p>

            </div>


            <span className="priority-count">
              {
                resolvedHistory.length
              } resolved complaints
            </span>

          </div>


          <div className="history-list">

            {resolvedHistory.map(
              (item) => (

                <div
                  className="history-item"
                  key={item.id}
                >

                  <div className="history-main">

                    <h3>
                      {
                        item.issue ||
                        "Civic Issue"
                      }
                    </h3>

                    <span>
                      {
                        item.location ||
                        "Unknown Area"
                      }
                    </span>

                  </div>


                  <div className="history-category">

                    {
                      item.category ||
                      "Other"
                    }

                  </div>


                  <div className="history-status">
                    Resolved
                  </div>

                </div>

              )
            )}


            {resolvedHistory.length === 0 && (

              <div className="history-empty">
                No resolved complaints yet.
              </div>

            )}

          </div>

        </section>


        {/* =================================================
            STATUS SUMMARY
        ================================================= */}

        <section
          className="status-summary"
          id="status-summary"
        >

          <div className="summary-card">

            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Processing
            </span>

            <strong>
              {processingCount}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Resolved
            </span>

            <strong>
              {resolvedCount}
            </strong>

          </div>

        </section>

      </main>

    </div>
  );
}


export default Dashboard;