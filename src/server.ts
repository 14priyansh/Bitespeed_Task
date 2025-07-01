import express, { Request, Response } from 'express'; // Importing Express framework and types for building the server and handling requests/responses
import { PrismaClient } from '@prisma/client'; // Importing Prisma Client to interact with the database
import dotenv from 'dotenv'; // To load environment variables from a .env file

dotenv.config(); // Initialize environment variables

const app = express(); // Create an Express app instance
const prisma = new PrismaClient(); // Instantiate Prisma Client to access the database

app.use(express.json()); // Middleware to parse incoming JSON requests

type ContactType = any; // Type alias for contact object (can be improved with exact shape later)

// Define the POST endpoint '/identify'
app.post('/identify', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body; // Destructure email and phoneNumber from request body

  // If neither email nor phoneNumber is provided, return a 400 error
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least email or phoneNumber is required' });
  }

  // Fetch all contacts that match either the given email or phoneNumber
  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ]
    }
  });

  const related = new Map<number, ContactType>(); // Map to store related contacts keyed by contact ID

  // Loop through all matched contacts
  for (const contact of matchedContacts) {
    related.set(contact.id, contact); // Add contact to the related map

    // If the contact has a linkedId, it's a secondary; fetch its siblings and parent
    if (contact.linkedId) {
      const linkedTo = await prisma.contact.findMany({ where: { linkedId: contact.linkedId } });
      linkedTo.forEach((c: ContactType) => related.set(c.id, c)); // Add siblings

      const parent = await prisma.contact.findUnique({ where: { id: contact.linkedId } });
      if (parent) related.set(parent.id, parent); // Add parent
    } else {
      // If it's a primary, fetch all its linked (secondary) contacts
      const children = await prisma.contact.findMany({ where: { linkedId: contact.id } });
      children.forEach((c: ContactType) => related.set(c.id, c)); // Add children
    }
  }

  const all = [...related.values()]; // Get all unique related contacts

  // Determine the primary contact; pick the one explicitly marked or the oldest by createdAt
  let primary = all.find(c => c.linkPrecedence === 'primary') ||
                all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // If no contacts exist in DB, create a new primary contact
  if (all.length === 0) {
    const newPrimary = await prisma.contact.create({
      data: { email, phoneNumber, linkPrecedence: 'primary' }
    });

    return res.json({
      contact: {
        primaryContactId: newPrimary.id,
        emails: [newPrimary.email].filter(Boolean),
        phoneNumbers: [newPrimary.phoneNumber].filter(Boolean),
        secondaryContactIds: []
      }
    });
  }

  // Check if exact combination of email and phoneNumber already exists
  const exists = all.some(c => c.email === email && c.phoneNumber === phoneNumber);
  
  // If not, create a new secondary contact linked to the primary
  if (!exists) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary.id,
        linkPrecedence: 'secondary'
      }
    }); 
  }

  // Fetch all contacts linked to the final primary contact
  const final = await prisma.contact.findMany({
    where: {
      OR: [{ id: primary.id }, { linkedId: primary.id }]
    }
  });

  // Prepare response fields: unique emails, phoneNumbers, and IDs of secondaries
  const emails = [...new Set(final.map((c: ContactType) => c.email).filter(Boolean))];
  const phones = [...new Set(final.map((c: ContactType) => c.phoneNumber).filter(Boolean))];
  const secondaryIds = final.filter((c: ContactType) => c.linkPrecedence === 'secondary').map((c: ContactType) => c.id);

  // Return the consolidated contact response
  res.json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds
    }
  });
});

// Start the server on the defined port (default: 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
