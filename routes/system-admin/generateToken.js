const express = require("express");
const Joi = require("joi");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const router = express.Router();
const prisma = new PrismaClient();

//validate schema/
const tokenSchema = Joi.object({
  email: Joi.string().email().required(),
  schoolName: Joi.string().required(),
});

router.post("/generate", async (req, res) => {
  const { email, schoolName } = req.body;

  const { error } = tokenSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // check the email exist//
    const existingToken = await prisma.token.findUnique({
      where: { email },
    });
    if (existingToken) {
      return res.status(409).json({
        message: "A token for this email has been token",
        token: existingToken.uniqueKey,
      });
    }

    // Generate a secure unique key
    const uniqueKey = `Test-${crypto.randomBytes(16).toString("hex")}`;

    // save the new token in the database
    const newToken = await prisma.token.create({
      data: {
        email,
        schoolName,
        uniqueKey,
        status: "active",
      },
    });

    // Respond with the generated token //
    return res.status(201).json({
      message: "Token generated successfully ",
      token: newToken.uniqueKey,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while generating the token.",
    });
  }
});

module.exports = router;
