-- CreateEnum
CREATE TYPE "LivestockStatus" AS ENUM ('HEALTHY', 'SICK', 'DECEASED', 'SOLD');

-- AlterTable
ALTER TABLE "Tank" ADD COLUMN     "hospital" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Livestock" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "name" TEXT,
    "status" "LivestockStatus" NOT NULL DEFAULT 'HEALTHY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Livestock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivestockStay" (
    "id" TEXT NOT NULL,
    "livestockId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivestockStay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Livestock_tankId_idx" ON "Livestock"("tankId");

-- CreateIndex
CREATE INDEX "LivestockStay_tankId_idx" ON "LivestockStay"("tankId");

-- CreateIndex
CREATE INDEX "LivestockStay_livestockId_startDate_idx" ON "LivestockStay"("livestockId", "startDate");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "LivestockStay_one_open_stay" ON "LivestockStay" ("livestockId") WHERE "endDate" IS NULL;

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivestockStay" ADD CONSTRAINT "LivestockStay_livestockId_fkey" FOREIGN KEY ("livestockId") REFERENCES "Livestock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivestockStay" ADD CONSTRAINT "LivestockStay_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
