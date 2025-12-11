const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

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



app.post('/task', async (req, res) => {
    try {
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


app.get('/', (req, res) => {
    res.send('Freelago server running and connected to MongoDB.');
});


app.listen(port, () => {
    console.log(`Freelago running at ${port}`);
});