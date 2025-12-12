const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

// যেহেতু Vercel এ এই port আর app.listen দরকার নেই, তাই এটি রিমুভ করা যেতে পারে, তবে ভেরিয়েবলটি থাকলে সমস্যা নেই
// const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.FREELAGO_USER}:${process.env.FREELAGO_PASSWORD}@simple-crud-server.a0arf8b.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let tasksCollection; 

// Run() ফাংশনের পরিবর্তে, আমরা একটি connectDB ফাংশন তৈরি করি যা কানেকশন স্ট্যাটাস চেক করে
async function connectDB() {
    // যদি tasksCollection ইতিমধ্যে ইনিশিয়ালাইজ করা থাকে, তবে নতুন করে কানেক্ট করার দরকার নেই (কোল্ড স্টার্ট এড়ানোর জন্য)
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
        console.error("MongoDB connection failed:", error);
        throw new Error("Failed to connect to Database");
    }
}

// আগের run().catch(console.dir); লাইনটি বাদ দেওয়া হলো


app.post('/task', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
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


app.get('/tasks', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
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


app.get('/tasks/:id', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
        const id = req.params.id; 
        const query = { _id: new ObjectId(id) }; 
        const task = await tasksCollection.findOne(query);

        if (!task) {
            console.log(`Task not found for ID: ${id}`);
            
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


app.get('/my-tasks/:email', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
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


app.put('/tasks/:id', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
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


app.delete('/task/:id', async (req, res) => {
    try {
        await connectDB(); // <-- কানেকশন নিশ্চিত করা
        
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


app.get('/', (req, res) => {
    // এখানেও কানেকশন চেক করা ভালো, কিন্তু শুধুমাত্র status দেখানোর জন্য দরকার নেই
    res.send('Freelago server running and ready to handle requests.'); 
});


// এই লাইনটি Vercel-এর জন্য আবশ্যক, যা আপনার Express অ্যাপটিকে Serverless Function-এ রূপান্তর করে।
module.exports = app;