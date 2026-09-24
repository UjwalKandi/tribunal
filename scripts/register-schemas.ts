/**
 * Register every tribunal.* value schema in Schema Registry.
 *
 * Run once after topics exist (confluent/setup.sh), before starting Flink
 * statements: Confluent Cloud for Apache Flink derives each table's columns
 * from these schemas.
 */

import { registerSchema } from "@/lib/stream/registry";
import { TOPICS } from "@/lib/stream/topics";

async function main() {
  for (const topic of Object.values(TOPICS)) {
    const id = await registerSchema(topic);
    console.log(`${topic}-value  →  schema id ${id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
