const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dbConfig = {
  user: "system",
  password: "MyPassword123",
  connectString: "localhost:1521/XEPDB1"
};

let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool(dbConfig);
    console.log('✓ Admin Server: Connected to Oracle Database');
  } catch (err) {
    console.error('❌ Database Error:', err.message);
    process.exit(1);
  }
}

initialize();

async function executeQuery(sql, binds = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(sql, binds, { 
      outFormat: oracledb.OUT_FORMAT_OBJECT 
    });
    return result.rows;
  } catch (error) {
    console.error('Query Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error('Close Error:', e);
      }
    }
  }
}

// 1. Executive Summary
app.get('/api/summary', async (req, res) => {
  try {
    const sql = `
      SELECT 'Total Villages' AS METRIC, COUNT(DISTINCT VILLAGE_ID) AS VALUE FROM VILLAGES
      UNION ALL
      SELECT 'Total Population', SUM(POPULATION) FROM (SELECT DISTINCT VILLAGE_ID, POPULATION FROM VILLAGES)
      UNION ALL
      SELECT 'Total Families', SUM(TOTAL_FAMILIES) FROM (SELECT DISTINCT VILLAGE_ID, TOTAL_FAMILIES FROM VILLAGES)
      UNION ALL
      SELECT 'Active Projects', COUNT(DISTINCT PROJECT_ID) FROM DEVELOPMENT_PROJECTS WHERE PROJECT_STATUS = 'IN_PROGRESS'
      UNION ALL
      SELECT 'Pending Complaints', COUNT(DISTINCT COMPLAINT_ID) FROM COMPLAINTS WHERE STATUS = 'PENDING'
      UNION ALL
      SELECT 'Total Resources', COUNT(DISTINCT RESOURCE_ID) FROM RESOURCES
      UNION ALL
      SELECT 'Work Reviews', COUNT(DISTINCT REVIEW_ID) FROM WORK_REVIEWS
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Villages Overview
app.get('/api/villages', async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT
        VILLAGE_ID,
        VILLAGE_NAME,
        VILLAGE_CODE,
        POPULATION,
        TOTAL_FAMILIES,
        STATUS
      FROM VILLAGES
      ORDER BY VILLAGE_ID
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Resource Distribution Summary
app.get('/api/resources-summary', async (req, res) => {
  try {
    const sql = `
      SELECT 
        RESOURCE_TYPE,
        COUNT(DISTINCT RESOURCE_NAME) AS UNIQUE_RESOURCES,
        SUM(TOTAL_COUNT) AS TOTAL_UNITS,
        ROUND(AVG(COVERAGE_PERCENTAGE), 2) AS AVG_COVERAGE,
        COUNT(DISTINCT VILLAGE_ID) AS VILLAGES_SERVED
      FROM (
        SELECT DISTINCT RESOURCE_ID, VILLAGE_ID, RESOURCE_TYPE, RESOURCE_NAME, TOTAL_COUNT, COVERAGE_PERCENTAGE
        FROM RESOURCES
      )
      GROUP BY RESOURCE_TYPE
      ORDER BY RESOURCE_TYPE
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Top Resources by Village
app.get('/api/top-resources', async (req, res) => {
  try {
    const sql = `
      SELECT VILLAGE_NAME, RESOURCE_TYPE, RESOURCE_NAME, TOTAL_COUNT, COVERAGE, QUALITY
      FROM (
        SELECT DISTINCT
          v.VILLAGE_NAME,
          r.RESOURCE_TYPE,
          r.RESOURCE_NAME,
          r.TOTAL_COUNT,
          r.COVERAGE_PERCENTAGE AS COVERAGE,
          r.QUALITY_STATUS AS QUALITY,
          ROW_NUMBER() OVER (PARTITION BY r.VILLAGE_ID, r.RESOURCE_TYPE, r.RESOURCE_NAME ORDER BY r.RESOURCE_ID) AS rn
        FROM RESOURCES r
        JOIN VILLAGES v ON r.VILLAGE_ID = v.VILLAGE_ID
      )
      WHERE rn = 1
      ORDER BY VILLAGE_NAME, RESOURCE_TYPE
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Complaints Status Breakdown
app.get('/api/complaints-status', async (req, res) => {
  try {
    const sql = `
      SELECT 
        STATUS,
        COUNT(DISTINCT COMPLAINT_ID) AS COUNT_COMPLAINTS,
        ROUND(COUNT(DISTINCT COMPLAINT_ID) * 100.0 / 
          (SELECT COUNT(DISTINCT COMPLAINT_ID) FROM COMPLAINTS), 2) AS PERCENTAGE
      FROM COMPLAINTS
      GROUP BY STATUS
      ORDER BY COUNT_COMPLAINTS DESC
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Recent Complaints
app.get('/api/recent-complaints', async (req, res) => {
  try {
    const sql = `
      SELECT COMPLAINT_ID, VILLAGE_NAME, TYPE, TITLE, STATUS, PRIORITY
      FROM (
        SELECT DISTINCT
          c.COMPLAINT_ID,
          v.VILLAGE_NAME,
          c.COMPLAINT_TYPE AS TYPE,
          c.COMPLAINT_TITLE AS TITLE,
          c.STATUS,
          c.PRIORITY_LEVEL AS PRIORITY,
          c.FILED_DATE,
          ROW_NUMBER() OVER (PARTITION BY c.COMPLAINT_TITLE, c.VILLAGE_ID ORDER BY c.FILED_DATE DESC) AS rn
        FROM COMPLAINTS c
        JOIN VILLAGES v ON c.VILLAGE_ID = v.VILLAGE_ID
      )
      WHERE rn = 1 AND ROWNUM <= 10
      ORDER BY FILED_DATE DESC
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Project Performance (FIXED - No duplicates)
app.get('/api/project-performance', async (req, res) => {
  try {
    const sql = `
      SELECT PROJECT_NAME, VILLAGE, BUDGET, SPENT, COMPLETION, STATUS
      FROM (
        SELECT 
          p.PROJECT_NAME,
          v.VILLAGE_NAME AS VILLAGE,
          p.BUDGET_ALLOCATED AS BUDGET,
          p.BUDGET_SPENT AS SPENT,
          p.COMPLETION_PERCENTAGE AS COMPLETION,
          p.PROJECT_STATUS AS STATUS,
          ROW_NUMBER() OVER (PARTITION BY p.PROJECT_NAME, p.VILLAGE_ID ORDER BY p.PROJECT_ID) AS rn
        FROM DEVELOPMENT_PROJECTS p
        JOIN VILLAGES v ON p.VILLAGE_ID = v.VILLAGE_ID
      )
      WHERE rn = 1
      ORDER BY COMPLETION DESC
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Work Reviews Summary
app.get('/api/work-reviews', async (req, res) => {
  try {
    const sql = `
      SELECT PROJECT, VILLAGE, RATING, COMMENTS
      FROM (
        SELECT 
          p.PROJECT_NAME AS PROJECT,
          v.VILLAGE_NAME AS VILLAGE,
          r.QUALITY_RATING AS RATING,
          NVL(r.REVIEW_COMMENTS, 'No comments') AS COMMENTS,
          ROW_NUMBER() OVER (PARTITION BY r.PROJECT_ID, r.VILLAGER_ID ORDER BY r.REVIEW_DATE DESC) AS rn
        FROM WORK_REVIEWS r
        JOIN DEVELOPMENT_PROJECTS p ON r.PROJECT_ID = p.PROJECT_ID
        JOIN VILLAGES v ON p.VILLAGE_ID = v.VILLAGE_ID
      )
      WHERE rn = 1
      ORDER BY RATING DESC
    `;
    const rows = await executeQuery(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Admin Dashboard Server is running' });
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Admin Dashboard Server Running           ║');
  console.log(`║   http://localhost:${PORT}                    ║`);
  console.log('╚════════════════════════════════════════════╝\n');
});

process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  if (pool) {
    await pool.close();
    console.log('Database pool closed');
  }
  process.exit(0);
});
