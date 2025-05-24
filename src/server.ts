import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

type ContactType = any;

app.post('/identify', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least email or phoneNumber is required' });
  }

  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ]
    }
  });

  const related = new Map<number, ContactType>();

  for (const contact of matchedContacts) {
    related.set(contact.id, contact);

    if (contact.linkedId) {
      const linkedTo = await prisma.contact.findMany({ where: { linkedId: contact.linkedId } });
      linkedTo.forEach((c: ContactType) => related.set(c.id, c));

      const parent = await prisma.contact.findUnique({ where: { id: contact.linkedId } });
      if (parent) related.set(parent.id, parent);
    } else {
      const children = await prisma.contact.findMany({ where: { linkedId: contact.id } });
      children.forEach((c: ContactType) => related.set(c.id, c));
    }
  }

  const all = [...related.values()];
  let primary = all.find(c => c.linkPrecedence === 'primary') || all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

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

  const exists = all.some(c => c.email === email && c.phoneNumber === phoneNumber);
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

  const final = await prisma.contact.findMany({
    where: {
      OR: [{ id: primary.id }, { linkedId: primary.id }]
    }
  });

  const emails = [...new Set(final.map((c: ContactType) => c.email).filter(Boolean))];
  const phones = [...new Set(final.map((c: ContactType) => c.phoneNumber).filter(Boolean))];
  const secondaryIds = final.filter((c: ContactType) => c.linkPrecedence === 'secondary').map((c: ContactType) => c.id);

  res.json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaryIds
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
