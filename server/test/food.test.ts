import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { createVeggies, execute } from './helpers';

const CREATE_FOOD = `#graphql
  mutation CreateFood($input: CreateFoodInput!) {
    createFood(input: $input) { id name type unsafeFor { id commonName } }
  }
`;

const FOODS = `#graphql
  query Foods($search: String, $type: FoodType) { foods(search: $search, type: $type) { id isCustom name type unsafeFor { id commonName } } }
`;

const FOOD = `#graphql
  query Food($id: ID!) { food(id: $id) { id isCustom name type unsafeFor { id commonName } } }
`;

let larryId: string;
let bobId: string;
let curatedId: string;
let pelletId: string;
let flakeId: string;

beforeEach(async () => {
  await prisma.food.deleteMany();

  const { bob, larry } = await createVeggies();
  bobId = bob.id
  larryId = larry.id

  // Mock a curated food in the DB
  const curated = await prisma.food.create({ data: { name: 'Bloodworms', type: 'FROZEN' } });
  curatedId = String(curated.id);

  const pellet = { name: 'Pellet', type: 'PELLET' };
  const flake = { name: 'Flake', type: 'FLAKE' };
  const savedPellet = await execute(CREATE_FOOD, { input: pellet }, larryId);
  const savedFlake = await execute(CREATE_FOOD, { input: flake }, bobId);
  pelletId = savedPellet.data?.createFood.id;
  flakeId = savedFlake.data?.createFood.id;
});

afterAll(async() => {
  await prisma.$disconnect();
});

describe('createFood', () => {
  it('successfully creates a custom food', async() => {
    const input = { name: 'Pellet Food', type: 'PELLET' }
    const result = await execute(CREATE_FOOD, { input }, larryId)
    const saved = await prisma.food.findUniqueOrThrow({ where: { id: Number(result.data?.createFood.id) } })

    expect(result.errors).toBeUndefined();
    expect(result.data?.createFood).toMatchObject({
      name: 'Pellet Food',
      type: 'PELLET',
    });
    expect(saved.ownerId).toBe(larryId)
  })

  it('correctly links a species the food is unsafe for', async() => {
    await prisma.species.deleteMany();
    const neonTetra = await prisma.species.create({
      data: {
        scientificName: 'Paracheirodon innesi',
        commonName: 'Neon tetra',
        waterType: 'FRESHWATER',
        temperament: 'PEACEFUL',
        minTankLiters: 40,
        adultSizeCm: 3,
        phMin: 6,
        phMax: 7,
        tempMinC: 20,
        tempMaxC: 26,
      },
    });
    const input = { name: 'Not Safe for Tetras', type: 'PELLET', unsafeForSpeciesIds: [neonTetra.id]}
    const result = await execute(CREATE_FOOD, { input }, larryId)

    expect(result.errors).toBeUndefined();
    expect(result.data?.createFood.unsafeFor[0].commonName).toEqual('Neon tetra');
  })

  it('returns an error if a name already exists', async() => {
    const input = { name: 'Pellet', type: 'PELLET' }
    const anotherPellet = await execute(CREATE_FOOD, { input }, larryId)

    expect(anotherPellet.errors?.[0]?.message).toEqual('You already have a food with this name.');
    const count = await prisma.food.count();
    expect(count).toBe(3);
  })

  it('allows the creation of a food with a duplicate name but different user', async() => {
    const input = { name: 'Pellet', type: 'PELLET' }
    const result = await execute(CREATE_FOOD, { input }, bobId)

    expect(result.errors).toBeUndefined();
    expect(result.data?.createFood).toMatchObject({ name: 'Pellet' });
  })

  it('returns an error if a blank name is submitted', async() => {
    const input = { name: '  ', type: 'PELLET' }
    const result = await execute(CREATE_FOOD, { input }, larryId)

    expect(result.errors?.[0]?.message).toBe('Food name is required.');
    const count = await prisma.food.count();
    expect(count).toBe(3);
  })

  it('returns an error if an invalid species id is submitted', async() => {
    const missingSpecies = { name: 'Pellet', type: 'PELLET', unsafeForSpeciesIds: [Number(pelletId) + 3000] }
    const badFormat = { name: 'Pellet', type: 'PELLET', unsafeForSpeciesIds: [crypto.randomUUID()] }
    const result1 = await execute(CREATE_FOOD, { input: missingSpecies }, larryId)
    const result2 = await execute(CREATE_FOOD, { input: badFormat }, larryId)

    expect(result1.errors?.[0]?.message).toBe('Species not found.');
    expect(result2.errors?.[0]?.message).toBe('Species not found.');
    const count = await prisma.food.count();
    expect(count).toBe(3);
  })
});

describe('food queries', () => {
  describe('FOOD', () => {
    it('only returns a food belonging to the current user', async() => {
      const larryList = await execute(FOOD, { id: pelletId }, larryId);
      expect(larryList.data?.food).toMatchObject({ id: pelletId, name: 'Pellet' });

      const bobList = await execute(FOOD, { id: flakeId }, bobId);
      expect(bobList.data?.food).toMatchObject({ id: flakeId, name: 'Flake' });

      const bobLookup = await execute(FOOD, { id: pelletId }, bobId);
      expect(bobLookup.data?.food).toBeNull();
    })

    it('returns null when given an invalid id', async() => {
      const noId = await execute(FOOD, { id: 'peepeepoopoo' }, larryId);
      expect(noId.errors).toBeUndefined();
      expect(noId.data?.food).toBeNull();
    })

    it('returns null when an id does not exist', async() => {
      const noId = await execute(FOOD, { id: String(Number(curatedId) + 1000) }, larryId);
      expect(noId.errors).toBeUndefined();
      expect(noId.data?.food).toBeNull();
    })
  })

  describe('FOODS', () => {
    it('returns a list of all foods, curated and belonging to the current user, when given no parameters', async() => {
      const larryList = await execute(FOODS, {}, larryId);
      expect(larryList.data?.foods).toEqual([
        { id: curatedId, isCustom: false, name: 'Bloodworms', type: 'FROZEN', unsafeFor: [] },
        { id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }
      ]);

      const bobList = await execute(FOODS, {}, bobId);
      expect(bobList.data?.foods).toEqual([
        { id: curatedId, isCustom: false, name: 'Bloodworms', type: 'FROZEN', unsafeFor: [] },
        { id: flakeId, isCustom: true, name: 'Flake', type: 'FLAKE', unsafeFor: [] }
      ]);
    })

    it('returns a list of foods with the correct name, curated and belonging to the current user.', async() => {
      const larryList = await execute(FOODS, { search: 'Pellet' }, larryId);
      expect(larryList.data?.foods).toEqual([{ id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }]);

      const gibberish = await execute(FOODS, { search: 'Gobbledigook' }, larryId);
      expect(gibberish.data?.foods).toEqual([]);

      const bobList = await execute(FOODS, { search: 'Flake' }, bobId);
      expect(bobList.data?.foods).toEqual([{ id: flakeId, isCustom: true, name: 'Flake', type: 'FLAKE', unsafeFor: [] }]);

      const bobLookup = await execute(FOODS, { search: 'Pellet' }, bobId);
      expect(bobLookup.data?.foods).toEqual([]);
    })

    it('returns a list of foods with the correct type, curated and belonging to the current user.', async() => {
      const larryList = await execute(FOODS, { type: 'PELLET' }, larryId);
      expect(larryList.data?.foods).toEqual([{ id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }]);

      const gibberish = await execute(FOODS, { type: 'LIVE' }, larryId);
      expect(gibberish.data?.foods).toEqual([]);

      const bobList = await execute(FOODS, { type: 'FLAKE' }, bobId);
      expect(bobList.data?.foods).toEqual([{ id: flakeId, isCustom: true, name: 'Flake', type: 'FLAKE', unsafeFor: [] }]);

      const bobLookup = await execute(FOODS, { type: 'PELLET' }, bobId);
      expect(bobLookup.data?.foods).toEqual([]);
    })

    it('returns a list of foods with the correct name and type, curated and belonging to the current user.', async() => {
      const larryList = await execute(FOODS, { search: 'Pellet', type: 'PELLET' }, larryId);
      expect(larryList.data?.foods).toEqual([{ id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }]);

      const bothWrong = await execute(FOODS, { search: 'Gobbldigook', type: 'LIVE' }, larryId);
      expect(bothWrong.data?.foods).toEqual([]);

      const wrongName = await execute(FOODS, { search: 'Gobbldigook', type: 'PELLET' }, larryId);
      expect(wrongName.data?.foods).toEqual([]);

      const wrongType = await execute(FOODS, { search: 'Pellet', type: 'LIVE' }, larryId);
      expect(wrongType.data?.foods).toEqual([]);

      const bobList = await execute(FOODS, { search: 'Flake', type: 'FLAKE' }, bobId);
      expect(bobList.data?.foods).toEqual([{ id: flakeId, isCustom: true, name: 'Flake', type: 'FLAKE', unsafeFor: [] }]);

      const bobLookup = await execute(FOODS, { search: 'Pellet', type: 'PELLET' }, bobId);
      expect(bobLookup.data?.foods).toEqual([]);
    })

    it('successfully finds matches to partial names', async() => {
      const larryList = await execute(FOODS, { search: 'Pel' }, larryId);
      expect(larryList.data?.foods).toEqual([{ id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }]);

      const lotsOfMatches = await execute(FOODS, { search: 'l' }, larryId);
      expect(lotsOfMatches.data?.foods).toEqual([
        { id: curatedId, isCustom: false, name: 'Bloodworms', type: 'FROZEN', unsafeFor: [] },
        { id: pelletId, isCustom: true, name: 'Pellet', type: 'PELLET', unsafeFor: [] }
      ]);
    })
  })
});
