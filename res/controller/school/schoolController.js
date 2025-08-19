// controllers/schoolController.js
const processImage = require("../../config/compress");
const prisma = require("../../util/prisma");

const updateStep = async (adminId) => {
  try {
     await prisma.admin.update({
       where: { id: adminId },
       data: { steps: {increment:1} },
     });
  } catch (error) {
   throw error;
  }
}

exports.setupSchool = async (req, res, next) => {
  const adminId = req.user.id;
  
  const { name, prefix, email, phoneNumber, address } = req.body;

  try {
    const existingSchool = await prisma.school.findUnique({ where: { name } });
    if (existingSchool) {
      return res.status(409).json({ message: "School already exists" });
    }

    const files = req.files;
    if (!files || !files.logoUrl || !files.stampUrl) {
      return res
        .status(400)
        .json({ message: "Please upload both logo and stamp" });
    }

    const processedLogoUrl = await processImage(
      files.logoUrl[0].buffer,
      "logos",
      `${prefix}-logo.jpeg`
    );

    const processedStampUrl = await processImage(
      files.stampUrl[0].buffer,
      "stamps",
      `${prefix}-stamp.jpeg`
    );

    const newSchool = await prisma.school.create({
      data: {
        name,
        prefix,
        logoUrl: processedLogoUrl,
        stampUrl: processedStampUrl,
        email,
        phoneNumber,
        address,
      },
    });

    await prisma.admin.update({
      where: { id: req.user.id },
      data: {
        schoolId: newSchool.id,
      },
    });

    await updateStep(adminId);

    res.status(201).json({
      message: "School created successfully",
      school: newSchool,
    });
  } catch (error) {
    next(error);
  }
};
