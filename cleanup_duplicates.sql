SET SERVEROUTPUT ON;
SET FEEDBACK ON;
SET VERIFY OFF;

PROMPT ════════════════════════════════════════════════════════
PROMPT   Cleaning Database - Removing All Duplicates
PROMPT ════════════════════════════════════════════════════════

-- Show current counts
PROMPT
PROMPT Current Database Status:
DECLARE
  v_projects NUMBER;
  v_complaints NUMBER;
  v_resources NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_projects FROM DEVELOPMENT_PROJECTS;
  SELECT COUNT(*) INTO v_complaints FROM COMPLAINTS;
  SELECT COUNT(*) INTO v_resources FROM RESOURCES;
  
  DBMS_OUTPUT.PUT_LINE('Total Projects: ' || v_projects);
  DBMS_OUTPUT.PUT_LINE('Total Complaints: ' || v_complaints);
  DBMS_OUTPUT.PUT_LINE('Total Resources: ' || v_resources);
END;
/

PROMPT
PROMPT Step 1: Removing duplicate PROJECTS...
-- Delete duplicate projects - keep only ONE per village + project name combination
DELETE FROM DEVELOPMENT_PROJECTS
WHERE ROWID NOT IN (
    SELECT MIN(ROWID)
    FROM DEVELOPMENT_PROJECTS
    GROUP BY VILLAGE_ID, PROJECT_NAME
);
PROMPT ✓ Duplicate projects removed

PROMPT
PROMPT Step 2: Removing duplicate COMPLAINTS...
-- Delete duplicate complaints
DELETE FROM COMPLAINTS
WHERE ROWID NOT IN (
    SELECT MIN(ROWID)
    FROM COMPLAINTS
    GROUP BY VILLAGE_ID, COMPLAINT_TITLE, COMPLAINT_TYPE
);
PROMPT ✓ Duplicate complaints removed

PROMPT
PROMPT Step 3: Removing duplicate RESOURCES...
-- Delete duplicate resources
DELETE FROM RESOURCES
WHERE ROWID NOT IN (
    SELECT MIN(ROWID)
    FROM RESOURCES
    GROUP BY VILLAGE_ID, RESOURCE_TYPE, RESOURCE_NAME
);
PROMPT ✓ Duplicate resources removed

PROMPT
PROMPT Step 4: Removing duplicate VILLAGERS...
-- Delete duplicate villagers
DELETE FROM VILLAGERS
WHERE ROWID NOT IN (
    SELECT MIN(ROWID)
    FROM VILLAGERS
    GROUP BY VILLAGE_ID, VILLAGER_NAME, PHONE
);
PROMPT ✓ Duplicate villagers removed

PROMPT
PROMPT Step 5: Removing duplicate REVIEWS...
-- Delete duplicate reviews
DELETE FROM WORK_REVIEWS
WHERE ROWID NOT IN (
    SELECT MIN(ROWID)
    FROM WORK_REVIEWS
    GROUP BY PROJECT_ID, VILLAGER_ID, QUALITY_RATING
);
PROMPT ✓ Duplicate reviews removed

-- Commit all changes
COMMIT;
PROMPT
PROMPT ✓✓✓ All changes committed to database ✓✓✓

-- Show final counts
PROMPT
PROMPT Final Database Status:
DECLARE
  v_projects NUMBER;
  v_complaints NUMBER;
  v_resources NUMBER;
  v_deleted_projects NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_projects FROM DEVELOPMENT_PROJECTS;
  SELECT COUNT(*) INTO v_complaints FROM COMPLAINTS;
  SELECT COUNT(*) INTO v_resources FROM RESOURCES;
  
  DBMS_OUTPUT.PUT_LINE('Total Projects Now: ' || v_projects);
  DBMS_OUTPUT.PUT_LINE('Total Complaints Now: ' || v_complaints);
  DBMS_OUTPUT.PUT_LINE('Total Resources Now: ' || v_resources);
END;
/

PROMPT
PROMPT ════════════════════════════════════════════════════════
PROMPT   ✓ Database Cleanup Completed Successfully!
PROMPT ════════════════════════════════════════════════════════
PROMPT

EXIT;
