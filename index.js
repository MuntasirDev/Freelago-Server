const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

// লোকাল ডেভেলপমেন্টের জন্য পোর্ট ডিফাইন করা হলো
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.FREELAGO_USER}:${process.env.FREELAGO_PASSWORD}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        // Serverless Cold Start টাইম কমানোর জন্য 'strict: true' বাদ দেওয়া হয়েছে
        deprecationErrors: true, 
    },
    // Serverless-এর জন্য অপটিমাইজেশন: কানেকশন পুলিং নিশ্চিত করতে maxPoolSize
    maxPoolSize: 1 
});

let tasksCollection; 

// --- MongoDB Connection Logic for Serverless ---

async function connectDB() {
    // যদি tasksCollection ইতিমধ্যে ইনিশিয়ালাইজ করা থাকে, তবে নতুন করে কানেক্ট করার দরকার নেই (ক্যাশিং)
    if (tasksCollection) {
        // console.log("DB connection already established."); 
        return;
    }

    try {
        await client.connect();
        
        const database = client.db("freelagoDB"); 
        tasksCollection = database.collection("tasks"); 

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged deployment. Successfully connected to MongoDB!");

    } catch (error) {
        // কানেকশন ব্যর্থ হলে স্পষ্ট এরর থ্রো করা হলো
        console.error("MongoDB connection failed:", error);
        throw new Error("Failed to connect to Database");
    }
}

// --- API Endpoints ---

// POST: নতুন টাস্ক তৈরি করা
app.post('/task', async (req, res) => {
    try {
        await connectDB(); 
        const newTask = req.body;
        newTask.createdAt = new Date().toISOString(); 
        newTask.bidsCount = 0; 
        const result = await tasksCollection.insertOne(newTask);
        res.send(result);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).send({ message: "Failed to create task" });
    }
});


// GET: সকল টাস্ক ফেচ করা
app.get('/tasks', async (req, res) => {
    try {
        await connectDB(); 
        const tasks = await tasksCollection.find({}).sort({ createdAt: -1 }).toArray();
        const formattedTasks = tasks.map(task => ({
            ...task,
            id: task._id.toString(), 
        }));
        res.send(formattedTasks);
    } catch (error) {
        console.error("Error fetching all tasks:", error);
        res.status(500).send({ message: "Failed to fetch all tasks" });
    }
});


// GET: আইডি দিয়ে সিঙ্গেল টাস্ক ফেচ করা
app.get('/tasks/:id', async (req, res) => {
    try {
        await connectDB(); 
        const id = req.params.id; 
        const query = { _id: new ObjectId(id) }; 
        const task = await tasksCollection.findOne(query);

        if (!task) {
            return res.status(404).send({ message: "Task not found" });
        }
        
        const formattedTask = {
            ...task,
            id: task._id.toString() 
        };
        
        res.send(formattedTask);
    } catch (error) {
        console.error("Error fetching single task by ID:", error);
        res.status(400).send({ message: "Invalid Task ID format or Server Error" });
    }
});


// GET: ইউজার ইমেইল দিয়ে টাস্ক ফেচ করা
app.get('/my-tasks/:email', async (req, res) => {
    try {
        await connectDB(); 
        const email = req.params.email;
        const query = { userEmail: email }; 
        const tasks = await tasksCollection.find(query).toArray();

        const formattedTasks = tasks.map(task => ({
            ...task,
            id: task._id.toString(),
            bidsCount: task.bidsCount || 0,
            
        }));
        res.send(formattedTasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send({ message: "Failed to fetch tasks" });
    }
});


// PUT: আইডি দিয়ে টাস্ক আপডেট করা
app.put('/tasks/:id', async (req, res) => {
    try {
        await connectDB(); 
        const id = req.params.id;
        const updatedTaskData = req.body;
        const query = { _id: new ObjectId(id) }; 
        
        const updateDoc = {
            $set: {
                title: updatedTaskData.title,
                description: updatedTaskData.description,
                category: updatedTaskData.category,
                price: updatedTaskData.price,
                budget: updatedTaskData.budget,
                deadline: updatedTaskData.deadline,
            },
        };
        const result = await tasksCollection.updateOne(query, updateDoc); 

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Task not found" });
        }
        if (result.modifiedCount === 1) {
             res.send({ message: "Task updated successfully", modifiedCount: 1 });
        } else {
             res.send({ message: "Task found, but no changes were made.", modifiedCount: 0 });
        }
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(400).send({ message: "Invalid Task ID format or Server Error" }); 
    }
});


// DELETE: আইডি দিয়ে টাস্ক মুছে ফেলা
app.delete('/task/:id', async (req, res) => {
    try {
        await connectDB(); 
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


// GET: বেস রুট / এর জন্য স্ট্যাটাস মেসেজ
app.get('/', (req, res) => {
    res.send('Freelago server running and ready to handle requests.'); 
});


// --- Local Development Setup ---
// এটি শুধুমাত্র লোকাল মেশিনে (development mode) অ্যাপটি চালু করবে
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port} (http://localhost:${port})`);
    });
}


// Vercel-এর জন্য আবশ্যক: Express অ্যাপটি module হিসেবে এক্সপোর্ট করা হলো
module.exports = app;