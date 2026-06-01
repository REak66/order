const mongoose = require('mongoose');
require('dotenv').config();

// Old Database URI
const SOURCE_URI = 'mongodb+srv://reakzyy6:ll2pjc0At4H7H59J@reak.qfaviy1.mongodb.net/lunch_order_db?appName=reak';
// New Database URI (defaults to your updated .env variable)
const TARGET_URI = process.env.MONGO_URI || 'mongodb+srv://nit:dbnit@pro1.94ek7pg.mongodb.net/order?appName=pro1';

async function migrate() {
    console.log('========================================');
    console.log('   STARTING MIGRATION (OLD DB -> NEW DB)');
    console.log('========================================');
    console.log(`Source DB: ${SOURCE_URI.replace(/:([^@]+)@/, ':****@')}`);
    console.log(`Target DB: ${TARGET_URI.replace(/:([^@]+)@/, ':****@')}`);

    let sourceConn, targetConn;
    try {
        console.log('\nConnecting to Source Database...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
        console.log('✅ Connected to Source Database successfully.');

        console.log('\nConnecting to Target Database...');
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
        console.log('✅ Connected to Target Database successfully.');

        // Get list of collections from Source DB
        const collections = await sourceConn.db.listCollections().toArray();
        const collectionNames = collections
            .map(c => c.name)
            .filter(name => !name.startsWith('system.')); // filter system collections

        console.log(`\nFound ${collectionNames.length} collections to migrate: ${collectionNames.join(', ')}`);

        for (const colName of collectionNames) {
            console.log(`\n----------------------------------------`);
            console.log(`Migrating collection: "${colName}"`);

            const sourceCol = sourceConn.collection(colName);
            const targetCol = targetConn.collection(colName);

            // Fetch all documents from Source
            const documents = await sourceCol.find({}).toArray();
            console.log(`Found ${documents.length} documents in source.`);

            if (documents.length === 0) {
                console.log(`Collection "${colName}" is empty. Skipping...`);
                continue;
            }

            // Clear Target Collection first to prevent duplicates or _id clashes
            console.log(`Clearing existing documents in target "${colName}"...`);
            await targetCol.deleteMany({});

            // Insert into Target
            console.log(`Copying ${documents.length} documents to target...`);
            const result = await targetCol.insertMany(documents);
            console.log(`✅ Successfully copied ${result.insertedCount} documents.`);
        }

        console.log(`\n========================================`);
        console.log(`🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!`);
        console.log(`========================================`);

    } catch (error) {
        console.error('\n❌ Migration failed with error:', error);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        process.exit(0);
    }
}

migrate();
