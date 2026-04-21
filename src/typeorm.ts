import 'sqlite3';
import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: 'sqlite',
  database: join(__dirname, '..', '/data/database.sqlite'),
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: true,
  logging: false,
});
