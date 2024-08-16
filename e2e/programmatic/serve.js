import serve from "@ladle/react/serve";

serve({
  port: 61105,
  host: "localhost",
  storyOrder: ["hello--world", "hello--ayo"],
});
