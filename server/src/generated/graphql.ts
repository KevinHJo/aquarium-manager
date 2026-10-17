import type { GraphQLResolveInfo } from 'graphql';
import type { Tank as TankModel, Livestock as LivestockModel, Species as SpeciesModel, Food as FoodModel, FeedingSchedule as FeedingScheduleModel, FeedingLog as FeedingLogModel } from '@prisma/client';
import type { Context } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateFeedingLogInput = {
  fedAt?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  scheduleId: Scalars['ID']['input'];
};

export type CreateFeedingScheduleInput = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  feedingAmount: Scalars['Float']['input'];
  feedingUnit: Scalars['String']['input'];
  foodId: Scalars['ID']['input'];
  intervalDays?: Scalars['Int']['input'];
  startDate: Scalars['String']['input'];
  tankId: Scalars['ID']['input'];
  timesPerDay?: Scalars['Int']['input'];
};

export type CreateFoodInput = {
  name: Scalars['String']['input'];
  type: FoodType;
  unsafeForSpeciesIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateLivestockInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  speciesId: Scalars['ID']['input'];
  status?: InputMaybe<LivestockStatus>;
  tankId: Scalars['ID']['input'];
};

export type CreateTankInput = {
  hospital?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  volumeLiters: Scalars['Float']['input'];
  waterType: WaterType;
};

export type DoseUnit =
  | 'DROPS'
  | 'GRAMS'
  | 'ML'
  | 'TABLETS';

export type EndFeedingScheduleInput = {
  endDate: Scalars['String']['input'];
  feedingScheduleId: Scalars['ID']['input'];
};

export type FeedingLog = {
  __typename?: 'FeedingLog';
  /** ISO 8601 timestamp */
  createdAt: Scalars['String']['output'];
  /** ISO 8601 timestamp */
  fedAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
};

export type FeedingSchedule = {
  __typename?: 'FeedingSchedule';
  /** ISO 8601 timestamp */
  createdAt: Scalars['String']['output'];
  /** Date, YYYY-MM-DD */
  endDate?: Maybe<Scalars['String']['output']>;
  feedingAmount: Scalars['Float']['output'];
  feedingUnit: Scalars['String']['output'];
  food: Food;
  id: Scalars['ID']['output'];
  intervalDays: Scalars['Int']['output'];
  logs: Array<FeedingLog>;
  /** Date, YYYY-MM-DD */
  startDate: Scalars['String']['output'];
  timesPerDay: Scalars['Int']['output'];
};


export type FeedingScheduleLogsArgs = {
  limit?: Scalars['Int']['input'];
};

export type Food = {
  __typename?: 'Food';
  id: Scalars['ID']['output'];
  isCustom: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  type: FoodType;
  unsafeFor: Array<Species>;
};

export type FoodType =
  | 'FLAKE'
  | 'FROZEN'
  | 'LIVE'
  | 'OTHER'
  | 'PELLET';

export type Livestock = {
  __typename?: 'Livestock';
  /** ISO 8601 timestamp */
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  species: Species;
  status: LivestockStatus;
};

export type LivestockStatus =
  | 'DECEASED'
  | 'HEALTHY'
  | 'SICK'
  | 'SOLD';

export type MaintenanceType =
  | 'FILTER_CHANGE'
  | 'FILTER_CLEANING'
  | 'GLASS_CLEANING'
  | 'GRAVEL_VACUUM'
  | 'OTHER'
  | 'PROTEIN_SKIMMER_CLEANING'
  | 'WATER_CHANGE';

export type MoveLivestockInput = {
  livestockId: Scalars['ID']['input'];
  newTankId: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createFeedingLog: FeedingLog;
  createFeedingSchedule: FeedingSchedule;
  createFood: Food;
  createLivestock: Livestock;
  createTank: Tank;
  endFeedingSchedule: FeedingSchedule;
  moveLivestock: Livestock;
};


export type MutationCreateFeedingLogArgs = {
  input: CreateFeedingLogInput;
};


export type MutationCreateFeedingScheduleArgs = {
  input: CreateFeedingScheduleInput;
};


export type MutationCreateFoodArgs = {
  input: CreateFoodInput;
};


export type MutationCreateLivestockArgs = {
  input: CreateLivestockInput;
};


export type MutationCreateTankArgs = {
  input: CreateTankInput;
};


export type MutationEndFeedingScheduleArgs = {
  input: EndFeedingScheduleInput;
};


export type MutationMoveLivestockArgs = {
  input: MoveLivestockInput;
};

export type Query = {
  __typename?: 'Query';
  /** One of the curated or current user's foods. */
  food?: Maybe<Food>;
  /** The food catalog, optionally filtered by name and type. Contains curated foods and the current user's custom foods. */
  foods: Array<Food>;
  /** The species catalog, optionally filtered by name and water type. */
  species: Array<Species>;
  /** One of the current user's tanks, or null if it doesn't exist or isn't theirs. */
  tank?: Maybe<Tank>;
  /** The current user's tanks, oldest first. */
  tanks: Array<Tank>;
};


export type QueryFoodArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFoodsArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<FoodType>;
};


export type QuerySpeciesArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
  waterType?: InputMaybe<WaterType>;
};


export type QueryTankArgs = {
  id: Scalars['ID']['input'];
};

export type Species = {
  __typename?: 'Species';
  adultSizeCm: Scalars['Float']['output'];
  commonName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  minTankLiters: Scalars['Int']['output'];
  phMax: Scalars['Float']['output'];
  phMin: Scalars['Float']['output'];
  scientificName: Scalars['String']['output'];
  tempMaxC: Scalars['Float']['output'];
  tempMinC: Scalars['Float']['output'];
  temperament: Temperament;
  waterType: WaterType;
};

export type Tank = {
  __typename?: 'Tank';
  /** ISO 8601 timestamp */
  createdAt: Scalars['String']['output'];
  feedingSchedules: Array<FeedingSchedule>;
  hospital: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  livestock: Array<Livestock>;
  name: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  volumeLiters: Scalars['Float']['output'];
  waterType: WaterType;
};

export type Temperament =
  | 'AGGRESSIVE'
  | 'PEACEFUL'
  | 'SEMI_AGGRESSIVE';

export type WaterType =
  | 'BRACKISH'
  | 'FRESHWATER'
  | 'SALTWATER';



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateFeedingLogInput: CreateFeedingLogInput;
  CreateFeedingScheduleInput: CreateFeedingScheduleInput;
  CreateFoodInput: CreateFoodInput;
  CreateLivestockInput: CreateLivestockInput;
  CreateTankInput: CreateTankInput;
  DoseUnit: DoseUnit;
  EndFeedingScheduleInput: EndFeedingScheduleInput;
  FeedingLog: ResolverTypeWrapper<FeedingLogModel>;
  FeedingSchedule: ResolverTypeWrapper<FeedingScheduleModel>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Food: ResolverTypeWrapper<FoodModel>;
  FoodType: FoodType;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Livestock: ResolverTypeWrapper<LivestockModel>;
  LivestockStatus: LivestockStatus;
  MaintenanceType: MaintenanceType;
  MoveLivestockInput: MoveLivestockInput;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  Species: ResolverTypeWrapper<SpeciesModel>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tank: ResolverTypeWrapper<TankModel>;
  Temperament: Temperament;
  WaterType: WaterType;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  CreateFeedingLogInput: CreateFeedingLogInput;
  CreateFeedingScheduleInput: CreateFeedingScheduleInput;
  CreateFoodInput: CreateFoodInput;
  CreateLivestockInput: CreateLivestockInput;
  CreateTankInput: CreateTankInput;
  EndFeedingScheduleInput: EndFeedingScheduleInput;
  FeedingLog: FeedingLogModel;
  FeedingSchedule: FeedingScheduleModel;
  Float: Scalars['Float']['output'];
  Food: FoodModel;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Livestock: LivestockModel;
  MoveLivestockInput: MoveLivestockInput;
  Mutation: {};
  Query: {};
  Species: SpeciesModel;
  String: Scalars['String']['output'];
  Tank: TankModel;
};

export type FeedingLogResolvers<ContextType = Context, ParentType extends ResolversParentTypes['FeedingLog'] = ResolversParentTypes['FeedingLog']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FeedingScheduleResolvers<ContextType = Context, ParentType extends ResolversParentTypes['FeedingSchedule'] = ResolversParentTypes['FeedingSchedule']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  feedingAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  feedingUnit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  food?: Resolver<ResolversTypes['Food'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  intervalDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  logs?: Resolver<Array<ResolversTypes['FeedingLog']>, ParentType, ContextType, RequireFields<FeedingScheduleLogsArgs, 'limit'>>;
  startDate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timesPerDay?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FoodResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Food'] = ResolversParentTypes['Food']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCustom?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FoodType'], ParentType, ContextType>;
  unsafeFor?: Resolver<Array<ResolversTypes['Species']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LivestockResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Livestock'] = ResolversParentTypes['Livestock']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  species?: Resolver<ResolversTypes['Species'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LivestockStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createFeedingLog?: Resolver<ResolversTypes['FeedingLog'], ParentType, ContextType, RequireFields<MutationCreateFeedingLogArgs, 'input'>>;
  createFeedingSchedule?: Resolver<ResolversTypes['FeedingSchedule'], ParentType, ContextType, RequireFields<MutationCreateFeedingScheduleArgs, 'input'>>;
  createFood?: Resolver<ResolversTypes['Food'], ParentType, ContextType, RequireFields<MutationCreateFoodArgs, 'input'>>;
  createLivestock?: Resolver<ResolversTypes['Livestock'], ParentType, ContextType, RequireFields<MutationCreateLivestockArgs, 'input'>>;
  createTank?: Resolver<ResolversTypes['Tank'], ParentType, ContextType, RequireFields<MutationCreateTankArgs, 'input'>>;
  endFeedingSchedule?: Resolver<ResolversTypes['FeedingSchedule'], ParentType, ContextType, RequireFields<MutationEndFeedingScheduleArgs, 'input'>>;
  moveLivestock?: Resolver<ResolversTypes['Livestock'], ParentType, ContextType, RequireFields<MutationMoveLivestockArgs, 'input'>>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  food?: Resolver<Maybe<ResolversTypes['Food']>, ParentType, ContextType, RequireFields<QueryFoodArgs, 'id'>>;
  foods?: Resolver<Array<ResolversTypes['Food']>, ParentType, ContextType, Partial<QueryFoodsArgs>>;
  species?: Resolver<Array<ResolversTypes['Species']>, ParentType, ContextType, Partial<QuerySpeciesArgs>>;
  tank?: Resolver<Maybe<ResolversTypes['Tank']>, ParentType, ContextType, RequireFields<QueryTankArgs, 'id'>>;
  tanks?: Resolver<Array<ResolversTypes['Tank']>, ParentType, ContextType>;
};

export type SpeciesResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Species'] = ResolversParentTypes['Species']> = {
  adultSizeCm?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  commonName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  minTankLiters?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phMax?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  phMin?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  scientificName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tempMaxC?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tempMinC?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  temperament?: Resolver<ResolversTypes['Temperament'], ParentType, ContextType>;
  waterType?: Resolver<ResolversTypes['WaterType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TankResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Tank'] = ResolversParentTypes['Tank']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  feedingSchedules?: Resolver<Array<ResolversTypes['FeedingSchedule']>, ParentType, ContextType>;
  hospital?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  livestock?: Resolver<Array<ResolversTypes['Livestock']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  volumeLiters?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  waterType?: Resolver<ResolversTypes['WaterType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  FeedingLog?: FeedingLogResolvers<ContextType>;
  FeedingSchedule?: FeedingScheduleResolvers<ContextType>;
  Food?: FoodResolvers<ContextType>;
  Livestock?: LivestockResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Species?: SpeciesResolvers<ContextType>;
  Tank?: TankResolvers<ContextType>;
};

