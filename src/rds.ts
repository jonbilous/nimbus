import AWS from "aws-sdk";
import { v4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";

const rds = new AWS.RDS({ region: "us-east-1" });
const nimbusDir = path.resolve(process.cwd(), ".nimbus");

type Engine = "aurora-mysql" | "aurora-postgresql";

const describeClusterInstances = async (cluster: AWS.RDS.DBCluster) => {
  return await Promise.all(
    (cluster.DBClusterMembers || []).map((cluster) =>
      rds
        .describeDBInstances({
          DBInstanceIdentifier: cluster.DBInstanceIdentifier,
        })
        .promise()
    )
  );
};

const describe = async (id: string) => {
  const result = await rds
    .describeDBClusters({ DBClusterIdentifier: id })
    .promise();

  const cluster = result.DBClusters?.[0];

  return cluster;
};

const create = async (name: string, engine: Engine) => {
  const engineVersion = "13.6";

  const username = "root";
  const password = v4();

  const dbCluster = await rds
    .createDBCluster({
      DBClusterIdentifier: name,
      Engine: engine,
      DatabaseName: name,
      EngineVersion: engineVersion,
      MasterUserPassword: password,
      MasterUsername: username,
      Port: 5432,
      ServerlessV2ScalingConfiguration: {
        MaxCapacity: 16,
        MinCapacity: 2,
      },
    })
    .promise();

  if (dbCluster.DBCluster) {
    const endpoint = dbCluster.DBCluster.Endpoint!;

    const instance = await rds
      .createDBInstance({
        DBClusterIdentifier: name,
        PubliclyAccessible: true,
        DBInstanceIdentifier: [name, "instance"].join("-"),
        EngineVersion: engineVersion,
        Engine: engine,
        DBInstanceClass: "db.serverless",
      })
      .promise();

    const prismaUrl = `postgresql://${username}:${password}@${endpoint}/${name}?schema=public`;

    const result = { name, username, password, endpoint, prismaUrl };

    await fs.mkdir(nimbusDir).catch(() => {});

    await fs.writeFile(
      path.resolve(process.cwd(), ".nimbus", [name, ".json"].join("")),
      JSON.stringify(result)
    );

    return result;
  } else {
    throw new Error("");
  }
};

export default { create, describe };
