const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
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
        console.log('✓ Connected to Oracle Database');
    } catch (err) {
        console.error('❌ Database Error:', err.message);
    }
}
initialize();

// ============================================
// GET ENDPOINTS
// ============================================

app.get('/api/stats', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            `SELECT 
                (SELECT COUNT(*) FROM VILLAGES) AS TOTAL_VILLAGES,
                (SELECT SUM(POPULATION) FROM VILLAGES) AS TOTAL_POPULATION,
                (SELECT COUNT(*) FROM DEVELOPMENT_PROJECTS WHERE PROJECT_STATUS = 'IN_PROGRESS') AS ONGOING_PROJECTS,
                (SELECT SUM(BUDGET_ALLOCATED) FROM DEVELOPMENT_PROJECTS) AS TOTAL_BUDGET,
                (SELECT COUNT(*) FROM WORK_REVIEWS) AS TOTAL_REVIEWS,
                (SELECT COUNT(*) FROM COMPLAINTS) AS TOTAL_COMPLAINTS,
                (SELECT COUNT(*) FROM DEVELOPMENT_PROJECTS WHERE COMPLETION_PERCENTAGE = 100) AS COMPLETED_PROJECTS
             FROM DUAL`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/villages', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            'SELECT * FROM VILLAGES ORDER BY VILLAGE_NAME',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/villages/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await pool.getConnection();
        
        // Get village info
        const village = await connection.execute(
            'SELECT * FROM VILLAGES WHERE VILLAGE_ID = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        
        const resources = await connection.execute(
            'SELECT * FROM RESOURCES WHERE VILLAGE_ID = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        
        const complaints = await connection.execute(
            `SELECT c.*, vl.VILLAGER_NAME 
             FROM COMPLAINTS c 
             LEFT JOIN VILLAGERS vl ON c.VILLAGER_ID = vl.VILLAGER_ID 
             WHERE c.VILLAGE_ID = :id 
             ORDER BY c.FILED_DATE DESC`,
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
      
        const projects = await connection.execute(
            'SELECT * FROM DEVELOPMENT_PROJECTS WHERE VILLAGE_ID = :id ORDER BY PROJECT_ID DESC',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.json({
            village: village.rows[0],
            resources: resources.rows,
            complaints: complaints.rows,
            projects: projects.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/villages/search/:query', async (req, res) => {
    let connection;
    try {
        const { query } = req.params;
        connection = await pool.getConnection();
        const result = await connection.execute(
            `SELECT * FROM VILLAGES 
             WHERE UPPER(VILLAGE_NAME) LIKE UPPER(:query) 
             OR UPPER(VILLAGE_CODE) LIKE UPPER(:query)
             ORDER BY VILLAGE_NAME`,
            { query: `%${query}%` },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/complaints', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            `SELECT c.*, v.VILLAGE_NAME, vl.VILLAGER_NAME,
                    ROUND((SYSDATE - c.FILED_DATE) * 24, 1) AS HOURS_AGO
             FROM COMPLAINTS c
             JOIN VILLAGES v ON c.VILLAGE_ID = v.VILLAGE_ID
             LEFT JOIN VILLAGERS vl ON c.VILLAGER_ID = vl.VILLAGER_ID
             ORDER BY c.FILED_DATE DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/projects', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            `SELECT p.*, v.VILLAGE_NAME 
             FROM DEVELOPMENT_PROJECTS p 
             JOIN VILLAGES v ON p.VILLAGE_ID = v.VILLAGE_ID 
             ORDER BY p.PROJECT_ID DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.get('/api/resources', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.execute(
            'SELECT * FROM RESOURCES ORDER BY VILLAGE_ID, RESOURCE_TYPE',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// ============================================
// POST ENDPOINTS
// ============================================


app.post('/api/villages', async (req, res) => {
    let connection;
    try {
        const { village_name, village_code, population, total_families } = req.body;
        connection = await pool.getConnection();
        await connection.execute(
            `INSERT INTO VILLAGES (VILLAGE_ID, VILLAGE_NAME, VILLAGE_CODE, POPULATION, TOTAL_FAMILIES, STATUS, CREATED_DATE)
             VALUES (village_seq.NEXTVAL, :1, :2, :3, :4, 'ACTIVE', SYSDATE)`,
            [village_name, village_code, population, total_families],
            { autoCommit: true }
        );
        console.log(`✓ Village added: ${village_name}`);
        res.json({ success: true, message: 'गांव सफलतापूर्वक जोड़ा गया!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.post('/api/complaints', async (req, res) => {
    let connection;
    try {
        const { complaint_type, complaint_title, complaint_description, location, priority_level, village_id } = req.body;
        connection = await pool.getConnection();
        await connection.execute(
            `INSERT INTO COMPLAINTS (COMPLAINT_ID, VILLAGER_ID, VILLAGE_ID, COMPLAINT_TYPE, COMPLAINT_TITLE, COMPLAINT_DESCRIPTION, LOCATION, PRIORITY_LEVEL, STATUS, FILED_DATE)
             VALUES (complaint_seq.NEXTVAL, 1, :1, :2, :3, :4, :5, :6, 'PENDING', SYSDATE)`,
            [village_id || 1, complaint_type, complaint_title, complaint_description, location, priority_level],
            { autoCommit: true }
        );
        console.log(`✓ Complaint added: ${complaint_title}`);
        res.json({ success: true, message: 'आपकी शिकायत सफलतापूर्वक दर्ज हो गई!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.post('/api/resources', async (req, res) => {
    let connection;
    try {
        const { village_id, resource_type, resource_name, total_count, coverage_percentage, quality_status } = req.body;
        connection = await pool.getConnection();
        await connection.execute(
            `INSERT INTO RESOURCES (RESOURCE_ID, VILLAGE_ID, RESOURCE_TYPE, RESOURCE_NAME, TOTAL_COUNT, COVERAGE_PERCENTAGE, QUALITY_STATUS)
             VALUES (resource_seq.NEXTVAL, :1, :2, :3, :4, :5, :6)`,
            [village_id, resource_type, resource_name, total_count, coverage_percentage, quality_status],
            { autoCommit: true }
        );
        console.log(`✓ Resource added: ${resource_name}`);
        res.json({ success: true, message: 'संसाधन सफलतापूर्वक जोड़ा गया!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});


app.post('/api/reviews', async (req, res) => {
    let connection;
    try {
        const { project_id, quality_rating, review_comments } = req.body;
        connection = await pool.getConnection();
        await connection.execute(
            `INSERT INTO WORK_REVIEWS (REVIEW_ID, PROJECT_ID, VILLAGER_ID, QUALITY_RATING, REVIEW_COMMENTS, REVIEW_DATE)
             VALUES (review_seq.NEXTVAL, :1, 1, :2, :3, SYSDATE)`,
            [project_id || 1, quality_rating, review_comments],
            { autoCommit: true }
        );
        console.log(`✓ Review added`);
        res.json({ success: true, message: 'आपकी समीक्षा सफलतापूर्वक जमा हो गई!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// ============================================
// UPDATE ENDPOINTS
// ============================================


app.put('/api/complaints/:id/resolve', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await pool.getConnection();
        await connection.execute(
            `UPDATE COMPLAINTS SET STATUS = 'RESOLVED' WHERE COMPLAINT_ID = :id`,
            [id],
            { autoCommit: true }
        );
        console.log(`✓ Complaint resolved: ${id}`);
        res.json({ success: true, message: 'शिकायत हल के रूप में चिह्नित!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.put('/api/complaints/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { status } = req.body;
        connection = await pool.getConnection();
        await connection.execute(
            `UPDATE COMPLAINTS SET STATUS = :status WHERE COMPLAINT_ID = :id`,
            [status, id],
            { autoCommit: true }
        );
        console.log(`✓ Complaint status updated: ${id}`);
        res.json({ success: true, message: 'शिकायत स्थिति अपडेट की गई!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.listen(PORT, () => {
    console.log('\n============================================');
    console.log('  ग्राम सेवा Server Running');
    console.log(`  http://localhost:${PORT}/user-dashboard.html`);
    console.log('============================================\n');
});
