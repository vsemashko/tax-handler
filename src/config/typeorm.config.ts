import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'taxhandler',
  password: process.env.DB_PASSWORD || 'taxhandler_dev_password',
  database: process.env.DB_DATABASE || 'taxhandler',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
