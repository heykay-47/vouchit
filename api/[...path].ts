import serverless from 'serverless-http';
import { createApp } from './app';

export default serverless(createApp());
