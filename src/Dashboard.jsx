import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import publicData from "./publicData";

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

function Dashboard() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const snapshot = await getDocs(collection(db, "feedback"));

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFeedback(data);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-box">
          <h2>JAN NITI</h2>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // -----------------------------
  // ISSUE COUNTS
  // -----------------------------

  const issueCounts = {};

  feedback.forEach((item) => {
    const issue = item.issue || "Other";
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  // -----------------------------
  // AREA COUNTS
  // -----------------------------

  const areaCounts = {};

  feedback.forEach((item) => {
    const area = item.location || "Unknown";
    areaCounts[area] = (areaCounts[area] || 0) + 1;
  });

  // -----------------------------
  // GROUP AREA + CATEGORY
  // -----------------------------

  const categoryGroups = {};

  feedback.forEach((item) => {
    const area = item.location || "Unknown";
    const category = item.category || "Other Civic Service";
    const key = `${area}|||${category}`;

    if (!categoryGroups[key]) {
      categoryGroups[key] = {
        area,
        category,
        complaints: [],
      };
    }

    categoryGroups[key].complaints.push(item);
  });

  // -----------------------------
  // PRIORITY CALCULATION
  // -----------------------------

  const priorities = Object.values(categoryGroups).map((group) => {
    const { area, category, complaints } = group;

    const demand = complaints.length;
    const demandScore = Math.min(demand * 20, 100);

    const areaData = publicData[area]?.[category];

    let infrastructureScore = 50;
    let populationNeed = 50;
    let investmentGap = 50;

    if (areaData) {
      infrastructureScore = areaData.infrastructureScore;
      populationNeed = areaData.populationNeed;
      investmentGap = areaData.investmentGap;
    }

    const infrastructureGap = 100 - infrastructureScore;

    // 40% Citizen Demand
    // 30% Infrastructure Gap
    // 20% Population Need
    // 10% Investment Gap

    const priorityScore =
      demandScore * 0.4 +
      infrastructureGap * 0.3 +
      populationNeed * 0.2 +
      investmentGap * 0.1;

    const issueFrequency = {};

    complaints.forEach((item) => {
      const issue = item.issue || "Other";
      issueFrequency[issue] =
        (issueFrequency[issue] || 0) + 1;
    });

    const mainIssue =
      Object.entries(issueFrequency).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "Civic issue";

    const amrutCategory =
      complaints.find((item) => item.amrutCategory)
        ?.amrutCategory || "Not Applicable";

    return {
      area,
      category,
      demand,
      demandScore,
      infrastructureGap,
      populationNeed,
      investmentGap,
      priorityScore: Math.round(priorityScore),
      mainIssue,
      amrutCategory,
      recommendation:
        projectRecommendations[category] ||
        "Further assessment required",
    };
  });

  priorities.sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const topPriority = priorities[0];

  const maxIssueCount =
    Math.max(...Object.values(issueCounts), 1);

  const maxAreaCount =
    Math.max(...Object.values(areaCounts), 1);

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <div className="brand">JAN NITI</div>
          <p>Policymaker Dashboard</p>
        </div>

        <div className="header-status">
          Development Prioritization
        </div>
      </header>

      <main className="dashboard-content">

        {/* OVERVIEW */}
        <section>
          <div className="section-heading">
            <h2>Overview</h2>
            <p>Citizen feedback and development demand</p>
          </div>

          <div className="overview-grid">

            <div className="stat-card">
              <span>Total Feedback</span>
              <strong>{feedback.length}</strong>
              <small>Citizen submissions</small>
            </div>

            <div className="stat-card">
              <span>Issues Reported</span>
              <strong>
                {Object.keys(issueCounts).length}
              </strong>
              <small>Unique issue types</small>
            </div>

            <div className="stat-card">
              <span>Areas Covered</span>
              <strong>
                {Object.keys(areaCounts).length}
              </strong>
              <small>Locations represented</small>
            </div>

          </div>
        </section>

        {/* TOP PRIORITY */}
        {topPriority && (
          <section>
            <div className="section-heading">
              <h2>Top Development Priority</h2>
              <p>Highest-ranked area and development category</p>
            </div>

            <div className="top-priority">

              <div className="priority-main">

                <div className="rank-badge">#1</div>

                <div>
                  <h3>{topPriority.area}</h3>

                  <p className="category-name">
                    {topPriority.category}
                  </p>

                  <p className="issue-text">
                    Main issue: {topPriority.mainIssue}
                  </p>
                </div>

              </div>

              <div className="score-box">
                <span>Priority Score</span>
                <strong>
                  {topPriority.priorityScore}
                  <small>/100</small>
                </strong>
              </div>

              <div className="score-bar">
                <div
                  style={{
                    width: `${topPriority.priorityScore}%`,
                  }}
                />
              </div>

              <div className="factor-grid">

                <div>
                  <span>Citizen Demand</span>
                  <strong>
                    {topPriority.demand} feedback
                  </strong>
                </div>

                <div>
                  <span>Infrastructure Gap</span>
                  <strong>
                    {topPriority.infrastructureGap}/100
                  </strong>
                </div>

                <div>
                  <span>Population Need</span>
                  <strong>
                    {topPriority.populationNeed}/100
                  </strong>
                </div>

                <div>
                  <span>Investment Gap</span>
                  <strong>
                    {topPriority.investmentGap}/100
                  </strong>
                </div>

              </div>

              <div className="recommendation">
                <span>Recommended Project</span>
                <strong>
                  {topPriority.recommendation}
                </strong>
              </div>

              <div className="amrut-info">
                <span>AMRUT 2.0 Category</span>
                <strong>
                  {topPriority.amrutCategory}
                </strong>
              </div>

            </div>
          </section>
        )}

        {/* DEVELOPMENT PRIORITIES */}
        <section>
          <div className="section-heading">
            <h2>Development Priorities</h2>
            <p>Ranked using citizen demand and contextual public data</p>
          </div>

          {priorities.length === 0 ? (
            <div className="empty-card">
              No citizen feedback available yet.
            </div>
          ) : (
            <div className="priority-list">

              {priorities.map((item, index) => (
                <div
                  className="priority-row"
                  key={`${item.area}-${item.category}`}
                >

                  <div className="priority-number">
                    #{index + 1}
                  </div>

                  <div className="priority-info">
                    <h3>{item.area}</h3>
                    <p>{item.category}</p>
                    <small>
                      Main issue: {item.mainIssue}
                    </small>
                  </div>

                  <div className="priority-demand">
                    <span>Demand</span>
                    <strong>{item.demand}</strong>
                  </div>

                  <div className="priority-score-small">
                    <span>Score</span>
                    <strong>{item.priorityScore}</strong>
                  </div>

                  <div className="mini-score-bar">
                    <div
                      style={{
                        width: `${item.priorityScore}%`,
                      }}
                    />
                  </div>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* ANALYSIS */}
        <div className="analysis-grid">

          {/* ISSUE ANALYSIS */}
          <section className="panel-section">
            <div className="section-heading">
              <h2>Issue Analysis</h2>
              <p>Frequency of reported issues</p>
            </div>

            <div className="analysis-card">

              {Object.entries(issueCounts).length === 0 ? (
                <p>No issues reported yet.</p>
              ) : (
                Object.entries(issueCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([issue, count]) => (
                    <div
                      className="bar-item"
                      key={issue}
                    >
                      <div className="bar-label">
                        <span>{issue}</span>
                        <strong>{count}</strong>
                      </div>

                      <div className="horizontal-bar">
                        <div
                          style={{
                            width: `${(count / maxIssueCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
              )}

            </div>
          </section>

          {/* AREA DEMAND */}
          <section className="panel-section">
            <div className="section-heading">
              <h2>Demand by Area</h2>
              <p>Citizen feedback distribution</p>
            </div>

            <div className="analysis-card">

              {Object.entries(areaCounts).length === 0 ? (
                <p>No area data available.</p>
              ) : (
                Object.entries(areaCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([area, count]) => (
                    <div
                      className="bar-item"
                      key={area}
                    >
                      <div className="bar-label">
                        <span>{area}</span>
                        <strong>{count}</strong>
                      </div>

                      <div className="horizontal-bar">
                        <div
                          style={{
                            width: `${(count / maxAreaCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
              )}

            </div>
          </section>

        </div>

        {/* CITIZEN FEEDBACK */}
        <section>
          <div className="section-heading">
            <h2>Citizen Feedback</h2>
            <p>Latest submissions received by Jan Niti</p>
          </div>

          {feedback.length === 0 ? (
            <div className="empty-card">
              No citizen feedback available.
            </div>
          ) : (
            <div className="feedback-list">

              {feedback.map((item) => (
                <div
                  className="feedback-item"
                  key={item.id}
                >

                  <div className="feedback-header">

                    <div>
                      <h3>
                        {item.issue || "Civic Issue"}
                      </h3>

                      <span>
                        {item.location || "Unknown Area"}
                      </span>
                    </div>

                    <div className="feedback-category">
                      {item.category || "Other"}
                    </div>

                  </div>

                  <p className="problem">
                    {item.problem}
                  </p>

                  <div className="feedback-details">

                    <div>
                      <span>AMRUT 2.0</span>
                      <strong>
                        {item.amrutCategory ||
                          "Not Applicable"}
                      </strong>
                    </div>

                    <div>
                      <span>Severity</span>
                      <strong>
                        {item.severity || "Not classified"}
                      </strong>
                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default Dashboard;