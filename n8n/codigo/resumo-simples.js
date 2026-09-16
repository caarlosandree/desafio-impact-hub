return [{ json: { ok: true, itens: $input.all().filter((item) => item.json.id).length } }];
