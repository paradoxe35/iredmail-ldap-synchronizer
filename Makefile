make:
	@echo "Enter 'make deploy' to deploy the application."

deploy:
	@source ansible/venv/bin/activate && \
	git archive --format=zip --output=repository.zip HEAD && \
	ansible-playbook -i ansible/hosts ansible/playbook.yml

push:
	git remote | xargs -L1 git push --all