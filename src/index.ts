#!/usr/bin/env node

import { program as cli } from "commander";
import rds from "./rds";

cli.name("nimbus");
cli.description("Create and manage serverless databases").version("1.0.0");

cli
  .command("create")
  .argument("[name]", "Name of the database you'd like to create")
  .description("Create a serverless database")
  .action(async (name: string | null) => {
    if (!name) {
      return cli.error("You must provide a database name");
    }

    console.log("🎉 Creating database", name);

    const result = await rds.create(name!, "aurora-postgresql");

    console.log(result);

    console.log("🥰 all done!");
  });

cli
  .command("describe")
  .argument("[name]", "Name of the database you'd like to describe")
  .description("Show information about an existing database")
  .action(async (name) => {
    const description = await rds.describe(name).catch((err) => null);

    if (!description) {
      return cli.error("Database not found");
    }

    return console.log(JSON.stringify(description, null, 2));
  });

cli.parse(process.argv);
