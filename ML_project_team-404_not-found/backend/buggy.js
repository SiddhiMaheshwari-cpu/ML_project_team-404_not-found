/**
 * ============================================================================
 * SYSTEM: AURA-OS MOCK TASK ENGINE
 * FILE: buggy.js
 * DESCRIPTION: Real-world complex JS file with hidden logical & async errors.
 * ============================================================================
 */

const SYSTEM_CONFIG = {
    maxRetries: 3,
    timeoutMs: 5000,
    enableLogging: true,
    environments: ['dev', 'staging', 'prod']
};

// Global bounded execution logs to prevent memory leaks
const MAX_GLOBAL_LOGS = 1000;
const globalExecutionLogs = [];

/**
 * Mock Database Connection Class
 */
class DatabaseConnection {
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.isConnected = false;
        this.activeQueries = 0;
    }

    async connect() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                console.log(`[DB] Connected to ${this.connectionString}`);
                resolve(true);
            }, 500);
        });
    }

    async query(sql, params) {
        if (!this.isConnected) throw new Error("DB not connected!");
        this.activeQueries++;
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.activeQueries--;
                if (sql.includes('ERROR')) {
                    reject(new Error("SQL Execution Failed"));
                } else {
                    resolve([{ id: 1, result: "Success", data: params }]);
                }
            }, Math.random() * 300 + 100);
        });
    }

    disconnect() {
        this.isConnected = false;
        console.log("[DB] Disconnected.");
    }
}

/**
 * Utility: Deep merge objects without mutating sources
 */
function mergeConfigs(defaultConf, userConf) {
    const result = Array.isArray(defaultConf) ? [...defaultConf] : { ...defaultConf };
    if (!userConf) return result;

    for (const key of Object.keys(userConf)) {
        if (
            userConf[key] !== null &&
            typeof userConf[key] === 'object' &&
            !Array.isArray(userConf[key])
        ) {
            result[key] = mergeConfigs(
                result[key] && typeof result[key] === 'object' ? result[key] : {},
                userConf[key]
            );
        } else {
            result[key] = userConf[key];
        }
    }
    return result;
}

/**
 * Utility: Simulates fetching external API data
 */
async function fetchExternalData(endpoint, id) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ endpoint, id, status: 200, timestamp: Date.now() });
        }, 200);
    });
}

/**
 * Main Task Processing Engine
 */
class TaskEngine {
    constructor(dbConnection) {
        this.db = dbConnection;
        this.processedCount = 0;
        this.taskQueue = [];
        this.isProcessing = false;
    }

    loadTasks(tasks) {
        this.taskQueue = [...tasks];
        console.log(`[Engine] Loaded ${this.taskQueue.length} tasks.`);
    }

    /**
     * Attempts to process all loaded tasks sequentially
     */
    async processAllTasks() {
        this.isProcessing = true;
        console.log("[Engine] Starting task processing...");

        for (const task of this.taskQueue) {
            try {
                await this.db.query(`SELECT * FROM tasks WHERE id = ?`, [task.id]);
                this.processedCount++;
                this.logTaskExecution(task.id, 'SUCCESS');
            } catch (error) {
                console.error(`[Engine] Task ${task.id} failed:`, error.message);
                this.logTaskExecution(task.id, 'FAILED');
            }
        }

        console.log(`[Engine] Finished processing. Total processed: ${this.processedCount}`);
        this.isProcessing = false;
    }

    /**
     * Syncs user profiles with external API
     */
    async syncUserProfiles(users) {
        console.log("[Engine] Syncing user profiles...");

        const syncPromises = users.map(async (user) => {
            const apiData = await fetchExternalData('/api/users', user.id);
            return await this.db.query(`UPDATE users SET data = ?`, [apiData]);
        });

        await Promise.all(syncPromises);
        console.log("[Engine] User profiles sync completed!");
    }

    /**
     * Schedule tasks with a delay
     */
    scheduleReminders(reminders) {
        console.log("[Engine] Scheduling reminders...");

        for (let i = 0; i < reminders.length; i++) {
            setTimeout(() => {
                console.log(`[Engine] Sending reminder for: ${reminders[i].title}`);
                this.logTaskExecution(`Reminder_${i}`, 'SENT');
            }, 1000 * (i + 1));
        }
    }

    /**
     * Validates data integrity before DB insertion
     */
    validateData(dataset) {
        console.log("[Engine] Validating dataset...");

        dataset.forEach((dataRow) => {
            if (!dataRow.isValid) {
                this.db.query("INSERT INTO error_logs (data) VALUES (?)", [dataRow.id]).catch((err) => {
                    console.error("[Engine] Failed to log invalid data:", err.message);
                });
            }
        });
    }

    logTaskExecution(taskId, status) {
        if (globalExecutionLogs.length >= MAX_GLOBAL_LOGS) {
            globalExecutionLogs.shift();
        }
        globalExecutionLogs.push({
            taskId,
            status,
            timestamp: new Date().toISOString()
        });
    }

    getReport() {
        return {
            totalProcessed: this.processedCount,
            logSize: globalExecutionLogs.length,
            isEngineBusy: this.isProcessing
        };
    }
}

/**
 * Event Emitter logic for Pipeline tracking
 */
class PipelineTracker {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    emit(eventName, data) {
        const eventCallbacks = this.events[eventName];
        if (eventCallbacks) {
            eventCallbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in event listener for ${eventName}:`, e);
                }
            });
        }
    }
}

// ============================================================================
// SYSTEM EXECUTION SIMULATION
// ============================================================================

async function runSimulation() {
    console.log("=== STARTING SYSTEM SIMULATION ===");

    // 1. Initialize DB
    const db = new DatabaseConnection("postgres://localhost:5432/aura_db");
    await db.connect();

    // 2. Setup Engine
    const engine = new TaskEngine(db);
    const tracker = new PipelineTracker();

    tracker.on('batchComplete', function(report) {
        console.log("[Tracker] Batch completion report received:", report);
    });

    // 3. Load Mock Data
    const mockTasks = [
        { id: 101, name: "Data cleanup" },
        { id: 102, name: "Index rebuild" },
        { id: 103, name: "Cache flush" }
    ];
    
    const mockUsers = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ];

    const mockReminders = [
        { id: 1, title: "Database Backup" },
        { id: 2, title: "Log Rotation" }
    ];

    const mockDataset = [
        { id: 1, isValid: true },
        { id: 2, isValid: false }
    ];

    // 4. Run pipeline
    engine.loadTasks(mockTasks);
    await engine.processAllTasks();
    await engine.syncUserProfiles(mockUsers);
    engine.scheduleReminders(mockReminders);
    engine.validateData(mockDataset);

    tracker.emit('batchComplete', engine.getReport());
    db.disconnect();
}

runSimulation();