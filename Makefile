make:
	source ansible/venv/bin/activate && \
	git archive --format=zip --output=repository.zip HEAD && \
	ansible-playbook -i ansible/hosts ansible/playbook.yml
