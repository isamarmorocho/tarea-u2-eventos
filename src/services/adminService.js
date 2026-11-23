const prisma = require("../db/prisma");

const createTimeBlocksService = async (startTime, endTime) => {
  const newTimeBlock = await prisma.timeBlock.create({
    data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  });
  return newTimeBlock;
};

const listReservationsService = async () => {
  const reservations = await prisma.appointment.findMany({
    include: {
      user: true,
      timeBlock: true,
    },
  });
  return reservations;
};

module.exports = { createTimeBlocksService, listReservationsService };
