-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('FROZEN', 'FLAKE', 'PELLET', 'LIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "DoseUnit" AS ENUM ('ML', 'DROPS', 'GRAMS', 'TABLETS');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('WATER_CHANGE', 'GLASS_CLEANING', 'GRAVEL_VACUUM', 'FILTER_CLEANING', 'PROTEIN_SKIMMER_CLEANING', 'FILTER_CHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "Food" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "type" "FoodType" NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "doseAmount" DOUBLE PRECISION NOT NULL,
    "doseUnit" "DoseUnit" NOT NULL,
    "dosePerLiters" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedingSchedule" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "foodId" INTEGER NOT NULL,
    "feedingAmount" DOUBLE PRECISION NOT NULL,
    "feedingUnit" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentSchedule" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "doseAmount" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedingLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "fedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doseAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FoodToSpecies" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FoodToSpecies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Food_ownerId_name_key" ON "Food"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_ownerId_name_key" ON "Medication"("ownerId", "name");

-- CreateIndex
CREATE INDEX "FeedingSchedule_tankId_idx" ON "FeedingSchedule"("tankId");

-- CreateIndex
CREATE INDEX "TreatmentSchedule_tankId_idx" ON "TreatmentSchedule"("tankId");

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_tankId_idx" ON "MaintenanceSchedule"("tankId");

-- CreateIndex
CREATE INDEX "FeedingLog_scheduleId_fedAt_idx" ON "FeedingLog"("scheduleId", "fedAt");

-- CreateIndex
CREATE INDEX "TreatmentLog_scheduleId_dosedAt_idx" ON "TreatmentLog"("scheduleId", "dosedAt");

-- CreateIndex
CREATE INDEX "MaintenanceLog_scheduleId_performedAt_idx" ON "MaintenanceLog"("scheduleId", "performedAt");

-- CreateIndex
CREATE INDEX "_FoodToSpecies_B_index" ON "_FoodToSpecies"("B");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Medication_curated_name_key" ON "Medication" ("name") WHERE "ownerId" IS NULL;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "Food_curated_name_key" ON "Food" ("name") WHERE "ownerId" IS NULL;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingSchedule" ADD CONSTRAINT "FeedingSchedule_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingSchedule" ADD CONSTRAINT "FeedingSchedule_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSchedule" ADD CONSTRAINT "TreatmentSchedule_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSchedule" ADD CONSTRAINT "TreatmentSchedule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingLog" ADD CONSTRAINT "FeedingLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FeedingSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentLog" ADD CONSTRAINT "TreatmentLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TreatmentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToSpecies" ADD CONSTRAINT "_FoodToSpecies_A_fkey" FOREIGN KEY ("A") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodToSpecies" ADD CONSTRAINT "_FoodToSpecies_B_fkey" FOREIGN KEY ("B") REFERENCES "Species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
