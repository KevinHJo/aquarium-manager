-- CreateEnum
CREATE TYPE "WaterType" AS ENUM ('FRESHWATER', 'BRACKISH', 'SALTWATER');

-- CreateEnum
CREATE TYPE "Temperament" AS ENUM ('PEACEFUL', 'SEMI_AGGRESSIVE', 'AGGRESSIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volumeLiters" DOUBLE PRECISION NOT NULL,
    "waterType" "WaterType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" SERIAL NOT NULL,
    "scientificName" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "waterType" "WaterType" NOT NULL,
    "temperament" "Temperament" NOT NULL,
    "minTankLiters" INTEGER NOT NULL,
    "adultSizeCm" DOUBLE PRECISION NOT NULL,
    "phMin" DOUBLE PRECISION NOT NULL,
    "phMax" DOUBLE PRECISION NOT NULL,
    "tempMinC" DOUBLE PRECISION NOT NULL,
    "tempMaxC" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Tank_ownerId_idx" ON "Tank"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Species_scientificName_key" ON "Species"("scientificName");

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
