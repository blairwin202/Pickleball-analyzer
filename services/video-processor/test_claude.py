import anthropic, os
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
r = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=50,
    messages=[{"role": "user", "content": "hello"}]
)
print(r.content[0].text)
