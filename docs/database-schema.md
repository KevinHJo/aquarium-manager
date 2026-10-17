# Database Schema

DB: PostgreSQL, managed by Prisma (`server/prisma/schema.prisma`). Prisma names each table after its model (`"User"`, `"Tank"`, ...) and keeps column names in camelCase.

## **`User`**
| column name       | datatype     | details                   |
|-------------------|--------------|---------------------------|
| **`id`**          | text         | not null, primary key, uuid |
| **`email`**       | text         | not null, indexed, unique |
| **`name`**        | text         |                           |
| **`createdAt`**   | timestamp(3) | not null, default now     |

## **`Tank`**
| column name        | datatype         | details                        |
|--------------------|------------------|--------------------------------|
| **`id`**           | text             | not null, primary key, uuid    |
| **`ownerId`**      | text             | not null, indexed, foreign key |
| **`name`**         | text             | not null                       |
| **`volumeLiters`** | double precision | not null                       |
| **`waterType`**    | `WaterType`      | not null                       |
| **`hospital`**     | boolean          | not null, default false        |
| **`notes`**        | text             |                                |
| **`createdAt`**    | timestamp(3)     | not null, default now          |
| **`updatedAt`**    | timestamp(3)     | not null, set by Prisma        |
+ `ownerId` references `User`, on delete cascade

## **`Livestock`**
One row per fish.

| column name     | datatype          | details                        |
|-----------------|-------------------|--------------------------------|
| **`id`**        | text              | not null, primary key, uuid    |
| **`tankId`**    | text              | not null, indexed, foreign key |
| **`speciesId`** | integer           | not null, foreign key          |
| **`name`**      | text              |                                |
| **`status`**    | `LivestockStatus` | not null, default `HEALTHY`    |
| **`createdAt`** | timestamp(3)      | not null, default now          |
| **`updatedAt`** | timestamp(3)      | not null, set by Prisma        |
+ `tankId` references `Tank` (the fish's current tank), on delete cascade
+ `speciesId` references `Species`, on delete restrict

## **`LivestockStay`**
One row per period a fish spent in a tank. The open stay (`endDate` null) is the current one.

| column name       | datatype     | details                        |
|-------------------|--------------|--------------------------------|
| **`id`**          | text         | not null, primary key, uuid    |
| **`livestockId`** | text         | not null, indexed, foreign key |
| **`tankId`**      | text         | not null, indexed, foreign key |
| **`startDate`**   | timestamp(3) | not null, default now          |
| **`endDate`**     | timestamp(3) |                                |
| **`createdAt`**   | timestamp(3) | not null, default now          |
| **`updatedAt`**   | timestamp(3) | not null, set by Prisma        |
+ `livestockId` references `Livestock`, on delete cascade
+ `tankId` references `Tank`, on delete cascade
+ index on [`livestockId`, `startDate`]
+ partial unique index on [`livestockId`] where `endDate` is null (one open stay per fish; added by hand in the migration SQL, not expressible in `schema.prisma`)

## **`Species`**
Shared catalog, not owned by any user. Loaded by `scripts/import-species.ts`.

| column name          | datatype         | details                        |
|----------------------|------------------|--------------------------------|
| **`id`**             | integer          | not null, primary key, serial  |
| **`scientificName`** | text             | not null, indexed, unique      |
| **`commonName`**     | text             | not null                       |
| **`waterType`**      | `WaterType`      | not null                       |
| **`temperament`**    | `Temperament`    | not null                       |
| **`minTankLiters`**  | integer          | not null                       |
| **`adultSizeCm`**    | double precision | not null                       |
| **`phMin`**          | double precision | not null                       |
| **`phMax`**          | double precision | not null                       |
| **`tempMinC`**       | double precision | not null                       |
| **`tempMaxC`**       | double precision | not null                       |
+ many-to-many with `Food` through `_FoodToSpecies` (foods unsafe for the species)

## **`Food`**
Curated entries have no owner and are visible to everyone. Custom entries belong to the user who created them and are visible only to that user. Curated entries are loaded by `scripts/import-foods.ts`.

| column name   | datatype   | details                        |
|---------------|------------|--------------------------------|
| **`id`**      | integer    | not null, primary key, serial  |
| **`ownerId`** | text       | foreign key, null for curated  |
| **`name`**    | text       | not null                       |
| **`type`**    | `FoodType` | not null                       |
+ `ownerId` references `User`, on delete cascade
+ unique index on [`ownerId`, `name`] (custom names unique per user)
+ partial unique index on [`name`] where `ownerId` is null (curated names unique; added by hand in the migration SQL)
+ many-to-many with `Species` through `_FoodToSpecies` (species the food is unsafe for)

## **`_FoodToSpecies`**
Join table created by Prisma for the implicit many-to-many between `Food.unsafeFor` and `Species.unsafeFoods`. Not queried directly.

| column name | datatype | details                                   |
|-------------|----------|-------------------------------------------|
| **`A`**     | integer  | not null, primary key (with `B`), foreign key |
| **`B`**     | integer  | not null, primary key (with `A`), indexed, foreign key |
+ `A` references `Food`, on delete cascade
+ `B` references `Species`, on delete cascade

## **`Medication`**
Curated entries have no owner and are visible to everyone. Custom entries belong to the user who created them and are visible only to that user. Curated entries are loaded by `scripts/import-medications.ts`. Recommended dose reads as `doseAmount` `doseUnit` per `dosePerLiters` liters.

| column name         | datatype         | details                        |
|---------------------|------------------|--------------------------------|
| **`id`**            | integer          | not null, primary key, serial  |
| **`ownerId`**       | text             | foreign key, null for curated  |
| **`name`**          | text             | not null                       |
| **`doseAmount`**    | double precision | not null                       |
| **`doseUnit`**      | `DoseUnit`       | not null                       |
| **`dosePerLiters`** | double precision | not null                       |
+ `ownerId` references `User`, on delete cascade
+ unique index on [`ownerId`, `name`] (custom names unique per user)
+ partial unique index on [`name`] where `ownerId` is null (curated names unique; added by hand in the migration SQL)

## **`FeedingSchedule`**
Frequency reads as `timesPerDay` times every `intervalDays` days.

| column name         | datatype         | details                        |
|---------------------|------------------|--------------------------------|
| **`id`**            | text             | not null, primary key, uuid    |
| **`tankId`**        | text             | not null, indexed, foreign key |
| **`foodId`**        | integer          | not null, foreign key          |
| **`feedingAmount`** | double precision | not null                       |
| **`feedingUnit`**   | text             | not null, free text            |
| **`startDate`**     | date             | not null                       |
| **`endDate`**       | date             | null while ongoing             |
| **`timesPerDay`**   | integer          | not null, default 1            |
| **`intervalDays`**  | integer          | not null, default 1            |
| **`createdAt`**     | timestamp(3)     | not null, default now          |
| **`updatedAt`**     | timestamp(3)     | not null, set by Prisma        |
+ `tankId` references `Tank`, on delete cascade
+ `foodId` references `Food`, on delete no action (blocks deleting a food in use; checked after cascades, so deleting a user still removes their custom foods)

## **`TreatmentSchedule`**
Allowed on any tank, hospital or not. Frequency reads as `timesPerDay` times every `intervalDays` days.

| column name        | datatype         | details                                 |
|--------------------|------------------|-----------------------------------------|
| **`id`**           | text             | not null, primary key, uuid             |
| **`tankId`**       | text             | not null, indexed, foreign key          |
| **`medicationId`** | integer          | not null, foreign key                   |
| **`doseAmount`**   | double precision | not null, planned dose in the medication's `doseUnit` |
| **`startDate`**    | date             | not null                                |
| **`endDate`**      | date             | null while ongoing                      |
| **`timesPerDay`**  | integer          | not null, default 1                     |
| **`intervalDays`** | integer          | not null, default 1                     |
| **`createdAt`**    | timestamp(3)     | not null, default now                   |
| **`updatedAt`**    | timestamp(3)     | not null, set by Prisma                 |
+ `tankId` references `Tank`, on delete cascade
+ `medicationId` references `Medication`, on delete no action (blocks deleting a medication in use; checked after cascades, so deleting a user still removes their custom medications)

## **`MaintenanceSchedule`**
Frequency reads as `timesPerDay` times every `intervalDays` days.

| column name        | datatype          | details                        |
|--------------------|-------------------|--------------------------------|
| **`id`**           | text              | not null, primary key, uuid    |
| **`tankId`**       | text              | not null, indexed, foreign key |
| **`type`**         | `MaintenanceType` | not null                       |
| **`startDate`**    | date              | not null                       |
| **`endDate`**      | date              | null while ongoing             |
| **`timesPerDay`**  | integer           | not null, default 1            |
| **`intervalDays`** | integer           | not null, default 1            |
| **`createdAt`**    | timestamp(3)      | not null, default now          |
| **`updatedAt`**    | timestamp(3)      | not null, set by Prisma        |
+ `tankId` references `Tank`, on delete cascade

## **`FeedingLog`**
| column name      | datatype     | details                        |
|------------------|--------------|--------------------------------|
| **`id`**         | text         | not null, primary key, uuid    |
| **`scheduleId`** | text         | not null, indexed, foreign key |
| **`fedAt`**      | timestamp(3) | not null, default now          |
| **`notes`**      | text         |                                |
| **`createdAt`**  | timestamp(3) | not null, default now          |
+ `scheduleId` references `FeedingSchedule`, on delete cascade
+ index on [`scheduleId`, `fedAt`]

## **`TreatmentLog`**
| column name      | datatype         | details                                   |
|------------------|------------------|-------------------------------------------|
| **`id`**         | text             | not null, primary key, uuid               |
| **`scheduleId`** | text             | not null, indexed, foreign key            |
| **`dosedAt`**    | timestamp(3)     | not null, default now                     |
| **`doseAmount`** | double precision | amount given, in the medication's `doseUnit` |
| **`notes`**      | text             |                                           |
| **`createdAt`**  | timestamp(3)     | not null, default now                     |
+ `scheduleId` references `TreatmentSchedule`, on delete cascade
+ index on [`scheduleId`, `dosedAt`]

## **`MaintenanceLog`**
| column name       | datatype     | details                        |
|-------------------|--------------|--------------------------------|
| **`id`**          | text         | not null, primary key, uuid    |
| **`scheduleId`**  | text         | not null, indexed, foreign key |
| **`performedAt`** | timestamp(3) | not null, default now          |
| **`notes`**       | text         |                                |
| **`createdAt`**   | timestamp(3) | not null, default now          |
+ `scheduleId` references `MaintenanceSchedule`, on delete cascade
+ index on [`scheduleId`, `performedAt`]

## **Enums**
| enum                  | values                                       |
|-----------------------|----------------------------------------------|
| **`WaterType`**       | `FRESHWATER`, `BRACKISH`, `SALTWATER`        |
| **`Temperament`**     | `PEACEFUL`, `SEMI_AGGRESSIVE`, `AGGRESSIVE`  |
| **`LivestockStatus`** | `HEALTHY`, `SICK`, `DECEASED`, `SOLD`        |
| **`FoodType`**        | `FROZEN`, `FLAKE`, `PELLET`, `LIVE`, `OTHER` |
| **`DoseUnit`**        | `ML`, `DROPS`, `GRAMS`, `TABLETS`            |
| **`MaintenanceType`** | `WATER_CHANGE`, `GLASS_CLEANING`, `GRAVEL_VACUUM`, `FILTER_CLEANING`, `PROTEIN_SKIMMER_CLEANING`, `FILTER_CHANGE`, `OTHER` |
