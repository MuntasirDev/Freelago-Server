// index.js (Backend Server)
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB URI should be defined in your .env file
const uri = `mongodb+srv://${process.env.FREELAGO_USER}:${process.env.FREELAGO_PASSWORD}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let tasksCollection; 

async function run() {
    try {
        await client.connect();
        
        const database = client.db("freelagoDB"); 
        tasksCollection = database.collection("tasks"); 

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}
run().catch(console.dir);


// --- API Endpoints ---

// 1. CREATE (POST /task) - Add a new task
app.post('/task', async (req, res) => {
    try {
        const newTask = req.body;
        // Adding a server-side timestamp is generally safer
        newTask.createdAt = new Date().toISOString(); 
        // Ensure bids count is initialized to 0
        newTask.bidsCount = 0; 
        
        const result = await tasksCollection.insertOne(newTask);
        res.send(result);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).send({ message: "Failed to create task" });
    }
});

// 2. READ (GET /tasks) - Get ALL available tasks for browsing (NEW)
app.get('/tasks', async (req, res) => {
    try {
        // Fetch all tasks, sorted by newest first (createdAt descending)
        const tasks = await tasksCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        // Format the tasks for the frontend
        const formattedTasks = tasks.map(task => ({
            ...task,
            id: task._id.toString(), // Convert MongoDB ObjectId to string 'id'
        }));
        
        res.send(formattedTasks);
    } catch (error) {
        console.error("Error fetching all tasks:", error);
        res.status(500).send({ message: "Failed to fetch all tasks" });
    }
});

// 3. READ (GET /tasks/:id) - Get a single task by ID
app.get('/tasks/:id', async (req, res) => {
    try {
        const id = req.params.id; // ফ্রন্টএন্ড থেকে আসা MongoDB _id 
        
        // ⭐ ফিক্স: ObjectId কনস্ট্রাক্টর ব্যবহার করে Query তৈরি করা ⭐
        const query = { _id: new ObjectId(id) }; 
        const task = await tasksCollection.findOne(query);

        if (!task) {
            console.log(`Task not found for ID: ${id}`);
            // যদি টাস্ক না পাওয়া যায়
            return res.status(404).send({ message: "Task not found" });
        }
        
        // ফ্রন্টএন্ডের সুবিধার জন্য MongoDB ObjectId কে 'id' প্রপার্টিতে ম্যাপ করা
        const formattedTask = {
            ...task,
            id: task._id.toString() 
        };
        
        // Response পাঠানো
        res.send(formattedTask);
        
    } catch (error) {
        // ID ফরম্যাট ভুল হলে বা অন্য কোনো সার্ভার এরর হলে
        console.error("Error fetching single task by ID:", error);
        res.status(400).send({ message: "Invalid Task ID format or Server Error" });
    }
});



// 3. READ (GET /my-tasks/:email) - Get all tasks posted by a specific user
app.get('/my-tasks/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = { userEmail: email }; 
        const tasks = await tasksCollection.find(query).toArray();

        const formattedTasks = tasks.map(task => ({
            ...task,
            id: task._id.toString(),
            bidsCount: task.bidsCount || 0,
            // Budget will naturally be a number if saved that way, otherwise adjust parsing in frontend
        }));
        res.send(formattedTasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send({ message: "Failed to fetch tasks" });
    }
});




// 4. DELETE (DELETE /task/:id) - Delete a single task
app.delete('/task/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }; 
        const result = await tasksCollection.deleteOne(query);
        
        if (result.deletedCount === 1) {
            res.send({ acknowledged: true, deletedCount: 1 });
        } else {
            res.status(404).send({ message: "Task not found" });
        }
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(400).send({ message: "Invalid Task ID format" });
    }
});

// 5. Base Route (GET /)
app.get('/', (req, res) => {
    res.send('Freelago server running and connected to MongoDB.');
});


// Start server
app.listen(port, () => {
    console.log(`Freelago running at ${port}`);
});