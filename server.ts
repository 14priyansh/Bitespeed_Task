import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// Type for contact records (can be improved for strict typing)
type ContactType = any;

// Main endpoint for identity reconciliation
app.post('/identify', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  // Require at least one identifier
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least email or phoneNumber is required' });
  }

  // Find all contacts matching the given email or phone number
  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ]
    }
  });

  // Map to collect all related contacts (primary and secondary)
  const related = new Map<number, ContactType>();

  // Traverse matched contacts to collect all related (linked) contacts
  for (const contact of matchedContacts) {
    related.set(contact.id, contact);

    if (contact.linkedId) {
      // If contact is secondary, find all contacts linked to its primary
      const linkedTo = await prisma.contact.findMany({ where: { linkedId: contact.linkedId } });
      linkedTo.forEach((c: ContactType) => related.set(c.id, c));

      // Also add the primary contact itself
      const parent = await prisma.contact.findUnique({ where: { id: contact.linkedId } });
      if (parent) related.set(parent.id, parent);
    } else {
      // If contact is primary, find all its secondary contacts
      const children = await prisma.contact.findMany({ where: { linkedId: contact.id } });
      children.forEach((c: ContactType) => related.set(c.id, c));
    }
  }

  // Convert related contacts to array for processing
  const all = [...related.values()];

  // Find the primary contact (or the oldest if none marked as primary)
  let primary = all.find(c => c.linkPrecedence === 'primary') ||
    all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // If no related contacts found, create a new primary contact
  if (all.length === 0) {
    const newPrimary = await prisma.contact.create({
      data: { email, phoneNumber, linkPrecedence: 'primary' }
    });

    // Respond with the new primary contact info
    return res.json({
      contact: {
        primaryContactId: newPrimary.id,
        emails: [newPrimary.email].filter(Boolean),
        phoneNumbers: [newPrimary.phoneNumber].filter(Boolean),
        secondaryContactIds: []
      }
    });
  }

  // Check if the exact email and phone number already exist
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

  // Fetch all contacts (primary and secondaries) for the response
  const final = await prisma.contact.findMany({
    where: {
      OR: [{ id: primary.id }, { linkedId: primary.id }]
    }
  });

  // Prepare unique emails, phone numbers, and secondary IDs for the response
  const emails = [...new Set(final.map((c: ContactType) => c.email).filter(Boolean))];
  const phones = [...new Set(final.map((c: ContactType) => c.phoneNumber).filter(Boolean))];
  const secondaryIds = final
    .filter((c: ContactType) => c.linkPrecedence === 'secondary')
    .map((c: ContactType) => c.id);

  // Respond with the consolidated contact information
  res.json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds
    }
  });
});

// Start the server on the specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});