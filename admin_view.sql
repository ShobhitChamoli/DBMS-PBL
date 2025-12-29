-- ============================================================================
-- GRAM SEVA ADMIN DASHBOARD - REPORT (NO ERRORS)
-- Generated: SYSDATE
-- Author: Village Management System
-- ============================================================================

SET SERVEROUTPUT ON SIZE 1000000;
SET LINESIZE 200;
SET PAGESIZE 100;
SET FEEDBACK OFF;
SET HEADING ON;
SET COLSEP ' | ';
CLEAR COLUMNS;
CLEAR BREAKS;
TTITLE OFF;
BTITLE OFF;

-- ============================================================================
-- Executive Summary
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                              EXECUTIVE SUMMARY                           ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

COLUMN metric FORMAT A45 HEADING 'Metric'
COLUMN value FORMAT 999,999,999 HEADING 'Value'

SELECT metric, value
FROM (
    SELECT 'Total Villages'       AS metric, COUNT(*)                      AS value, 1 AS sort_order FROM VILLAGES
    UNION ALL
    SELECT 'Total Population',     SUM(POPULATION),                         2 FROM VILLAGES
    UNION ALL
    SELECT 'Total Families',       SUM(TOTAL_FAMILIES),                     3 FROM VILLAGES
    UNION ALL
    SELECT 'Active Projects',      COUNT(*) ,                               4 FROM DEVELOPMENT_PROJECTS WHERE PROJECT_STATUS = 'IN_PROGRESS'
    UNION ALL
    SELECT 'Pending Complaints',   COUNT(*),                                5 FROM COMPLAINTS WHERE STATUS = 'PENDING'
    UNION ALL
    SELECT 'Total Resources',      COUNT(*) ,                               6 FROM RESOURCES
    UNION ALL
    SELECT 'Work Reviews',         COUNT(*) ,                               7 FROM WORK_REVIEWS
)
ORDER BY sort_order;

-- ============================================================================
-- Villages Overview
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                              VILLAGES OVERVIEW                           ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN village_id    FORMAT 9999           HEADING 'ID'
COLUMN village_name  FORMAT A40            HEADING 'Village Name'
COLUMN village_code  FORMAT A15            HEADING 'Code'
COLUMN population    FORMAT 999,999        HEADING 'Population'
COLUMN families      FORMAT 99,999         HEADING 'Families'
COLUMN status        FORMAT A15            HEADING 'Status'

SELECT 
    v.VILLAGE_ID AS village_id,
    v.VILLAGE_NAME AS village_name,
    v.VILLAGE_CODE AS village_code,
    v.POPULATION AS population,
    v.TOTAL_FAMILIES AS families,
    v.STATUS AS status
FROM VILLAGES v
ORDER BY v.VILLAGE_ID;

-- ============================================================================
-- Resource Distribution Summary
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                        RESOURCE DISTRIBUTION SUMMARY                      ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN resource_type     FORMAT A25         HEADING 'Resource Type'
COLUMN unique_resources  FORMAT 999         HEADING 'Unique'
COLUMN total_units       FORMAT 99,999      HEADING 'Total Units'
COLUMN avg_coverage      FORMAT 990.99      HEADING 'Avg Cov(%)'
COLUMN villages_served   FORMAT 999         HEADING 'Villages'

SELECT 
    r.RESOURCE_TYPE AS resource_type,
    COUNT(DISTINCT r.RESOURCE_NAME) AS unique_resources,
    SUM(r.TOTAL_COUNT) AS total_units,
    ROUND(AVG(r.COVERAGE_PERCENTAGE), 2) AS avg_coverage,
    COUNT(DISTINCT r.VILLAGE_ID) AS villages_served
FROM RESOURCES r
GROUP BY r.RESOURCE_TYPE
ORDER BY r.RESOURCE_TYPE;

-- ============================================================================
-- Top Resources By Village (Unique)
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                       TOP RESOURCES BY VILLAGE (Unique)                  ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN village_name   FORMAT A30   HEADING 'Village'
COLUMN resource_type  FORMAT A18   HEADING 'Type'
COLUMN resource_name  FORMAT A40   HEADING 'Resource Name'
COLUMN total_count    FORMAT 999   HEADING 'Units'
COLUMN coverage       FORMAT 990.99 HEADING 'Coverage(%)'
COLUMN quality        FORMAT A12   HEADING 'Quality'

SELECT *
FROM (
    SELECT 
        v.VILLAGE_NAME AS village_name,
        r.RESOURCE_TYPE AS resource_type,
        r.RESOURCE_NAME AS resource_name,
        r.TOTAL_COUNT AS total_count,
        r.COVERAGE_PERCENTAGE AS coverage,
        r.QUALITY_STATUS AS quality,
        ROW_NUMBER() OVER (PARTITION BY r.VILLAGE_ID, r.RESOURCE_TYPE ORDER BY r.RESOURCE_ID) AS rn
    FROM RESOURCES r
    JOIN VILLAGES v ON r.VILLAGE_ID = v.VILLAGE_ID
)
WHERE rn = 1
ORDER BY village_name, resource_type;

-- ============================================================================
-- Complaints Status Breakdown
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                          COMPLAINTS STATUS BREAKDOWN                     ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN status            FORMAT A20         HEADING 'Status'
COLUMN count_complaints  FORMAT 999         HEADING 'Count'
COLUMN percentage        FORMAT 990.99      HEADING 'Percent(%)'

SELECT 
    c.STATUS AS status,
    COUNT(*) AS count_complaints,
    ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM COMPLAINTS), 2) AS percentage
FROM COMPLAINTS c
GROUP BY c.STATUS
ORDER BY count_complaints DESC;

-- ============================================================================
-- Recent Complaints (Last 10)
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                          RECENT COMPLAINTS (Last 10)                     ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN complaint_id  FORMAT 9999    HEADING 'ID'
COLUMN village_name  FORMAT A25     HEADING 'Village'
COLUMN type          FORMAT A18     HEADING 'Type'
COLUMN title         FORMAT A45     HEADING 'Complaint Title'
COLUMN status        FORMAT A15     HEADING 'Status'
COLUMN priority      FORMAT A12     HEADING 'Priority'

SELECT *
FROM (
    SELECT 
        c.COMPLAINT_ID AS complaint_id,
        v.VILLAGE_NAME AS village_name,
        c.COMPLAINT_TYPE AS type,
        c.COMPLAINT_TITLE AS title,
        c.STATUS AS status,
        c.PRIORITY_LEVEL AS priority,
        ROW_NUMBER() OVER (PARTITION BY c.VILLAGE_ID, c.COMPLAINT_TITLE ORDER BY c.FILED_DATE DESC) AS rn
    FROM COMPLAINTS c
    JOIN VILLAGES v ON c.VILLAGE_ID = v.VILLAGE_ID
)
WHERE rn = 1 AND ROWNUM <= 10
ORDER BY complaint_id DESC;

-- ============================================================================
-- Project Performance
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                           PROJECT PERFORMANCE                            ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN project_name  FORMAT A45       HEADING 'Project Name'
COLUMN village       FORMAT A25       HEADING 'Village'
COLUMN budget        FORMAT 99,999,999 HEADING 'Budget'
COLUMN spent         FORMAT 99,999,999 HEADING 'Spent'
COLUMN completion    FORMAT 990.99    HEADING 'Complete(%)'
COLUMN status        FORMAT A15       HEADING 'Status'

SELECT *
FROM (
    SELECT 
        p.PROJECT_NAME AS project_name,
        v.VILLAGE_NAME AS village,
        p.BUDGET_ALLOCATED AS budget,
        p.BUDGET_SPENT AS spent,
        p.COMPLETION_PERCENTAGE AS completion,
        p.PROJECT_STATUS AS status,
        ROW_NUMBER() OVER (PARTITION BY p.VILLAGE_ID, p.PROJECT_NAME ORDER BY p.PROJECT_ID) AS rn
    FROM DEVELOPMENT_PROJECTS p
    JOIN VILLAGES v ON p.VILLAGE_ID = v.VILLAGE_ID
)
WHERE rn = 1
ORDER BY completion DESC;

-- ============================================================================
-- Work Reviews Summary
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                             WORK REVIEWS SUMMARY                         ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

CLEAR COLUMNS;

COLUMN project  FORMAT A45  HEADING 'Project'
COLUMN village  FORMAT A25  HEADING 'Village'
COLUMN rating   FORMAT 9    HEADING 'Rating'
COLUMN comments FORMAT A55  HEADING 'Comments'

SELECT 
    p.PROJECT_NAME AS project,
    v.VILLAGE_NAME AS village,
    r.QUALITY_RATING AS rating,
    NVL(r.REVIEW_COMMENTS, 'No comments') AS comments
FROM WORK_REVIEWS r
JOIN DEVELOPMENT_PROJECTS p ON r.PROJECT_ID = p.PROJECT_ID
JOIN VILLAGES v ON p.VILLAGE_ID = v.VILLAGE_ID
ORDER BY r.REVIEW_DATE DESC;

-- ============================================================================
-- END OF REPORT
-- ============================================================================

PROMPT ╔════════════════════════════════════════════════════════════════════════════╗
PROMPT ║                                END OF REPORT                             ║
PROMPT ╚════════════════════════════════════════════════════════════════════════════╝

SET FEEDBACK ON;
EXIT;
